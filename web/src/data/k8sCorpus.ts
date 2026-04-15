import type { K8sAnalysisChain, K8sCorpusMetadata, K8sCallTypeDistribution } from '@/types/k8sCorpus';

// ---------------------------------------------------------------------------
// Chain 1: Pod NotReady
// ---------------------------------------------------------------------------

const podNotReadyChain: K8sAnalysisChain = {
  id: 'pod-not-ready',
  name: 'Pod NotReady 调用链',
  description:
    '当容器健康检查失败或节点异常时，从 Kubelet 探针检测到 Pod 被驱逐的完整代码路径。涵盖探针管理、状态生成、API Server 同步、节点生命周期控制和污点驱逐五个核心阶段。',
  version: 'v1.35.0',
  totalFiles: 8,
  totalFunctions: 14,
  totalLinesOfCode: 8420,
  chainType: 'troubleshooting',
  topology: 'event-driven',
  callTypeDistribution: { direct: 4, grpc: 0, http: 1, event: 1, watch: 2 } satisfies K8sCallTypeDistribution,
  components: ['kubelet', 'controller-manager', 'api-server'],
  tags: ['故障排查', '事件驱动', '多分支并行', 'Probe → Status → Taint'],
  flowSteps: [
    '容器运行时状态变化 — 容器健康检查失败、退出或启动失败',
    'Kubelet 探针系统周期性执行 Readiness Probe，结果缓存到 readinessManager',
    '探针失败时 containerStatus.Ready 设为 false',
    'Status Manager 调用 GenerateContainersReadyCondition() 检查所有容器就绪状态',
    'GeneratePodReadyCondition() 综合容器就绪条件和 Readiness Gates 生成 Pod Ready 条件',
    'manager.SetPodStatus() 将状态缓存并标记版本号',
    'syncBatch() 触发 syncPod()，通过 PATCH/UPDATE 将状态同步到 API Server',
    'Node Lifecycle Controller 监控节点心跳，超时后标记 NodeReady=False/Unknown',
    '根据 nodeConditionToTaintKeyStatusMap 应用 NotReady 或 Unreachable 污点',
    'Taint Eviction Controller 检测 NoExecute 污点，驱逐无容忍的 Pod',
  ],
  sourceFiles: [
    {
      id: 'types',
      filePath: 'staging/src/k8s.io/api/core/v1/types.go',
      fileName: 'types.go',
      package: 'v1',
      component: 'api',
      description: 'Kubernetes 核心 API 类型定义，包含 Pod、Node、Condition、Taint 等所有基础类型',
      linesOfCode: 7200,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'PodConditionType',
          signature: 'type PodConditionType string',
          description: 'Pod 条件类型常量定义，包括 PodReady、ContainersReady、PodScheduled、Initialized',
          codeSnippet: `// PodConditionType defines the condition of a pod.
type PodConditionType string

const (
    // PodReady means the pod is able to service requests.
    PodReady PodConditionType = "Ready"
    // ContainersReady indicates whether all containers in the pod are ready.
    ContainersReady PodConditionType = "ContainersReady"
    // PodScheduled represents status of the scheduling process.
    PodScheduled PodConditionType = "PodScheduled"
    // PodInitialized means that all init containers have started successfully.
    PodInitialized PodConditionType = "Initialized"
)`,
          calledBy: [],
          calls: [],
        },
        {
          name: 'TaintEffect',
          signature: 'type TaintEffect string',
          description: 'Node 污点效果定义，NoExecute 效果会驱逐不容忍该污点的 Pod',
          codeSnippet: `type TaintEffect string

const (
    // TaintEffectNoSchedule: Do not allow new pods to schedule.
    TaintEffectNoSchedule TaintEffect = "NoSchedule"
    // TaintEffectPreferNoSchedule: Prefer not to schedule new pods.
    TaintEffectPreferNoSchedule TaintEffect = "PreferNoSchedule"
    // TaintEffectNoExecute: Evict any already-running pods that
    // do not tolerate the taint.
    TaintEffectNoExecute TaintEffect = "NoExecute"
)

const (
    TaintNodeNotReady           = "node.kubernetes.io/not-ready"
    TaintNodeUnreachable        = "node.kubernetes.io/unreachable"
    TaintNodeMemoryPressure     = "node.kubernetes.io/memory-pressure"
    TaintNodeDiskPressure       = "node.kubernetes.io/disk-pressure"
    TaintNodeNetworkUnavailable = "node.kubernetes.io/network-unavailable"
    TaintNodePIDPressure        = "node.kubernetes.io/pid-pressure"
)`,
          calledBy: [],
          calls: [],
        },
      ],
    },
    {
      id: 'prober_manager',
      filePath: 'pkg/kubelet/prober/prober_manager.go',
      fileName: 'prober_manager.go',
      package: 'prober',
      component: 'kubelet',
      description: '探针管理器，为每个容器的每种探针（readiness/liveness/startup）创建和管理 probe worker',
      linesOfCode: 320,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'AddPod',
          signature: 'func (m *manager) AddPod(pod *v1.Pod)',
          description: '当新 Pod 被 Kubelet 调度到本节点时，为其所有容器创建对应的 probe worker',
          codeSnippet: `func (m *manager) AddPod(pod *v1.Pod) {
    m.workerLock.Lock()
    defer m.workerLock.Unlock()

    key := probeKey{podUID: pod.UID}
    for _, c := range pod.Spec.Containers {
        key.containerName = c.Name

        if c.ReadinessProbe != nil {
            key.probeType = readiness
            if _, ok := m.workers[key]; !ok {
                w := newWorker(m, readiness, pod, c)
                m.workers[key] = w
                go w.run()
            }
        }
    }
}`,
          calledBy: ['kubelet.HandlePodAdditions'],
          calls: ['worker.run'],
        },
        {
          name: 'UpdatePodStatus',
          signature: 'func (m *manager) UpdatePodStatus(podUID types.UID, podStatus *v1.PodStatus)',
          description: '根据探针结果更新容器的 Ready 状态 — 容器必须 Running 且 readiness probe 成功',
          codeSnippet: `func (m *manager) UpdatePodStatus(podUID types.UID, podStatus *v1.PodStatus) {
    for i, c := range podStatus.ContainerStatuses {
        var ready bool
        if c.State.Running == nil {
            ready = false
        } else if result, ok := m.readinessManager.Get(
            kubecontainer.ParseContainerID(c.ContainerID)); ok {
            ready = result == results.Success
        } else {
            // No probe defined or not yet run — default to ready.
            ready = c.State.Running != nil
        }
        podStatus.ContainerStatuses[i].Ready = ready
    }
}`,
          calledBy: ['status_manager.SetPodStatus'],
          calls: ['readinessManager.Get'],
        },
      ],
    },
    {
      id: 'worker',
      filePath: 'pkg/kubelet/prober/worker.go',
      fileName: 'worker.go',
      package: 'prober',
      component: 'kubelet',
      description: '单个探针 worker 的执行循环，按配置的周期执行探针检查并缓存结果',
      linesOfCode: 280,
      importance: 'high',
      keyFunctions: [
        {
          name: 'run',
          signature: 'func (w *worker) run()',
          description: '探针 worker 主循环，按 periodSeconds 间隔执行 doProbe，直到 Pod 终止',
          codeSnippet: `func (w *worker) run() {
    probeTickerPeriod := time.Duration(
        w.spec.PeriodSeconds) * time.Second

    // Spread workers over the initial period.
    if probeTickerPeriod > time.Since(w.probeManager.start) {
        time.Sleep(time.Duration(rand.Float64() *
            float64(probeTickerPeriod)))
    }

    probeTicker := time.NewTicker(probeTickerPeriod)
    defer probeTicker.Stop()
    for w.doProbe() {
        <-probeTicker.C
    }
}`,
          calledBy: ['prober_manager.AddPod'],
          calls: ['worker.doProbe'],
        },
        {
          name: 'doProbe',
          signature: 'func (w *worker) doProbe() (keepGoing bool)',
          description: '执行单次探针检查，调用 prober 执行 HTTP/TCP/Exec 探针，根据结果更新 readinessManager',
          codeSnippet: `func (w *worker) doProbe() (keepGoing bool) {
    // ...container status checks...
    result, err := w.probeManager.prober.probe(
        w.probeType, w.pod, status, w.container, w.containerID)
    if err != nil {
        // Log and continue probing
        return true
    }

    if w.lastResult == result {
        w.resultRun++
    } else {
        w.lastResult = result
        w.resultRun = 1
    }

    if (result == results.Failure &&
        w.resultRun < int(w.spec.FailureThreshold)) ||
        (result == results.Success &&
        w.resultRun < int(w.spec.SuccessThreshold)) {
        return true
    }

    w.resultsManager.Set(w.containerID, result, w.pod)
    return true
}`,
          calledBy: ['worker.run'],
          calls: ['prober.probe', 'resultsManager.Set'],
        },
      ],
    },
    {
      id: 'generate',
      filePath: 'pkg/kubelet/status/generate.go',
      fileName: 'generate.go',
      package: 'status',
      component: 'kubelet',
      description: '生成 Pod 就绪条件的核心逻辑，综合容器状态和 Readiness Gates 判断 Pod 是否 Ready',
      linesOfCode: 180,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'GenerateContainersReadyCondition',
          signature: 'func GenerateContainersReadyCondition(spec *v1.PodSpec, containerStatuses []v1.ContainerStatus, podPhase v1.PodPhase) v1.PodCondition',
          description: '检查所有容器的 Ready 状态，任一容器未就绪则返回 ContainersReady=False',
          codeSnippet: `func GenerateContainersReadyCondition(
    spec *v1.PodSpec,
    containerStatuses []v1.ContainerStatus,
    podPhase v1.PodPhase,
) v1.PodCondition {
    // Determine the phase and reason
    if podPhase == v1.PodSucceeded {
        return newReadyCondition(false, PodCompleted, "")
    }

    unknownContainers, unreadyContainers :=
        getUnreadyContainers(spec, containerStatuses)
    if len(unknownContainers) > 0 {
        return newReadyCondition(false,
            UnknownContainerStatuses,
            unknownContainers.String())
    }
    if len(unreadyContainers) > 0 {
        return newReadyCondition(false,
            ContainersNotReady,
            unreadyContainers.String())
    }
    return newReadyCondition(true, "", "")
}`,
          calledBy: ['GeneratePodReadyCondition'],
          calls: ['getUnreadyContainers', 'newReadyCondition'],
        },
        {
          name: 'GeneratePodReadyCondition',
          signature: 'func GeneratePodReadyCondition(spec *v1.PodSpec, conditions []v1.PodCondition, containerStatuses []v1.ContainerStatus, podPhase v1.PodPhase) v1.PodCondition',
          description: '生成最终 Pod Ready 条件 — 依赖 ContainersReady 且所有 Readiness Gates 必须满足',
          codeSnippet: `func GeneratePodReadyCondition(
    spec *v1.PodSpec,
    conditions []v1.PodCondition,
    containerStatuses []v1.ContainerStatus,
    podPhase v1.PodPhase,
) v1.PodCondition {
    containersReady := GenerateContainersReadyCondition(
        spec, containerStatuses, podPhase)
    if containersReady.Status != v1.ConditionTrue {
        return containersReady
    }
    // Check readiness gates
    if len(spec.ReadinessGates) > 0 {
        for _, gate := range spec.ReadinessGates {
            c := findCondition(conditions,
                v1.PodConditionType(gate.ConditionType))
            if c == nil || c.Status != v1.ConditionTrue {
                return newReadyCondition(false,
                    ReadinessGatesNotReady,
                    gate.ConditionType)
            }
        }
    }
    return newReadyCondition(true, "", "")
}`,
          calledBy: ['status_manager.SetPodStatus'],
          calls: ['GenerateContainersReadyCondition', 'findCondition'],
        },
      ],
    },
    {
      id: 'status_manager',
      filePath: 'pkg/kubelet/status/status_manager.go',
      fileName: 'status_manager.go',
      package: 'status',
      component: 'kubelet',
      description: 'Pod 状态管理器，缓存 Pod 状态并定期或事件驱动地同步到 API Server',
      linesOfCode: 620,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'SetPodStatus',
          signature: 'func (m *manager) SetPodStatus(pod *v1.Pod, status v1.PodStatus)',
          description: '更新 Pod 状态缓存，分配单调递增版本号，触发同步通道',
          codeSnippet: `func (m *manager) SetPodStatus(
    pod *v1.Pod, status v1.PodStatus) {
    m.podStatusesLock.Lock()
    defer m.podStatusesLock.Unlock()

    // Ensure that the status we are caching is no older
    // than the previous status.
    oldStatus, found := m.podStatuses[pod.UID]
    if found && !isStatusMoreRecent(status, oldStatus) {
        return
    }

    m.podStatuses[pod.UID] = versionedPodStatus{
        status:  status,
        version: m.nextVersion(),
        podName: pod.Name,
    }

    select {
    case m.podStatusChannel <- struct{}{}:
    default:
        // channel already has a pending notification
    }
}`,
          calledBy: ['kubelet.syncPod'],
          calls: ['isStatusMoreRecent', 'nextVersion'],
        },
        {
          name: 'syncPod',
          signature: 'func (m *manager) syncPod(uid types.UID, status versionedPodStatus) error',
          description: '将缓存的 Pod 状态通过 PATCH 请求同步到 API Server',
          codeSnippet: `func (m *manager) syncPod(
    uid types.UID, status versionedPodStatus) error {
    // Get the latest pod from the API server
    pod, err := m.podManager.GetPodByUID(uid)
    if err != nil {
        return err
    }

    // Patch the status
    newPod, patchBytes, unchanged, err :=
        statusutil.PatchPodStatus(
            context.TODO(), m.kubeClient,
            pod.Namespace, pod.Name, pod.UID,
            pod.Status, status.status)
    if err != nil {
        return fmt.Errorf("error patching status for pod %q: %v",
            format.Pod(pod), err)
    }

    if !unchanged {
        klog.V(3).InfoS("Status for pod updated successfully",
            "pod", klog.KObj(pod), "statusVersion", status.version)
    }
    return nil
}`,
          calledBy: ['status_manager.syncBatch'],
          calls: ['PatchPodStatus'],
        },
      ],
    },
    {
      id: 'pod_util',
      filePath: 'pkg/api/v1/pod/util.go',
      fileName: 'util.go',
      package: 'pod',
      component: 'api',
      description: 'Pod 条件工具函数，提供判断 Pod 是否就绪、获取/更新 Pod 条件的便捷方法',
      linesOfCode: 240,
      importance: 'medium',
      keyFunctions: [
        {
          name: 'IsPodReady',
          signature: 'func IsPodReady(pod *v1.Pod) bool',
          description: '判断 Pod 是否就绪 — 检查 Ready 条件的 Status 是否为 True',
          codeSnippet: `// IsPodReady returns true if a pod is ready;
// false otherwise.
func IsPodReady(pod *v1.Pod) bool {
    return IsPodReadyConditionTrue(pod.Status)
}

// IsPodReadyConditionTrue returns true if a pod is ready.
func IsPodReadyConditionTrue(status v1.PodStatus) bool {
    condition := GetPodReadyCondition(status)
    return condition != nil &&
        condition.Status == v1.ConditionTrue
}

// GetPodReadyCondition extracts the pod ready condition.
func GetPodReadyCondition(
    status v1.PodStatus) *v1.PodCondition {
    for i, c := range status.Conditions {
        if c.Type == v1.PodReady {
            return &status.Conditions[i]
        }
    }
    return nil
}`,
          calledBy: ['controller.endpointslice', 'scheduler'],
          calls: [],
        },
      ],
    },
    {
      id: 'node_lifecycle',
      filePath: 'pkg/controller/nodelifecycle/node_lifecycle_controller.go',
      fileName: 'node_lifecycle_controller.go',
      package: 'nodelifecycle',
      component: 'controller-manager',
      description: '节点生命周期控制器，监控节点健康状态并在节点不可达时应用相应的 Taint',
      linesOfCode: 1280,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'monitorNodeHealth',
          signature: 'func (nc *Controller) monitorNodeHealth(ctx context.Context) error',
          description: '节点健康监控主循环 — 检查节点心跳超时，将不健康节点标记并应用 NotReady/Unreachable 污点',
          codeSnippet: `func (nc *Controller) monitorNodeHealth(
    ctx context.Context) error {
    // ...
    for i := range nodes {
        node := nodes[i]
        gracePeriod, observedReadyCondition,
            currentReadyCondition, err :=
            nc.tryUpdateNodeHealth(ctx, node)
        if err != nil {
            continue
        }

        if currentReadyCondition != nil {
            if err := nc.processTaintBaseEviction(
                ctx, node, &observedReadyCondition,
            ); err != nil {
                // Handle error
            }
        }
    }
    return nil
}`,
          calledBy: ['Controller.Run'],
          calls: ['tryUpdateNodeHealth', 'processTaintBaseEviction'],
        },
        {
          name: 'nodeConditionToTaintKeyStatusMap',
          signature: 'var nodeConditionToTaintKeyStatusMap map[v1.NodeConditionType]map[v1.ConditionStatus]string',
          description: '节点条件到污点键的映射表 — NodeReady=False 映射到 not-ready，Unknown 映射到 unreachable',
          codeSnippet: `var nodeConditionToTaintKeyStatusMap = map[v1.NodeConditionType]map[v1.ConditionStatus]string{
    v1.NodeReady: {
        v1.ConditionFalse:   v1.TaintNodeNotReady,
        v1.ConditionUnknown: v1.TaintNodeUnreachable,
    },
    v1.NodeMemoryPressure: {
        v1.ConditionTrue: v1.TaintNodeMemoryPressure,
    },
    v1.NodeDiskPressure: {
        v1.ConditionTrue: v1.TaintNodeDiskPressure,
    },
    v1.NodeNetworkUnavailable: {
        v1.ConditionTrue: v1.TaintNodeNetworkUnavailable,
    },
    v1.NodePIDPressure: {
        v1.ConditionTrue: v1.TaintNodePIDPressure,
    },
}`,
          calledBy: [],
          calls: [],
        },
      ],
    },
    {
      id: 'taint_eviction',
      filePath: 'pkg/controller/tainteviction/taint_eviction.go',
      fileName: 'taint_eviction.go',
      package: 'tainteviction',
      component: 'controller-manager',
      description: '污点驱逐控制器，监控节点的 NoExecute 污点变化，驱逐不具备对应 Toleration 的 Pod',
      linesOfCode: 480,
      importance: 'high',
      keyFunctions: [
        {
          name: 'handlePodUpdate',
          signature: 'func (tc *Controller) handlePodUpdate(ctx context.Context, podUpdate podUpdateItem) error',
          description: '处理 Pod 更新事件 — 检查 Pod 所在节点的 NoExecute 污点，决定是否驱逐',
          codeSnippet: `func (tc *Controller) handlePodUpdate(
    ctx context.Context,
    podUpdate podUpdateItem,
) error {
    pod, err := tc.podLister.Pods(
        podUpdate.podNamespace).Get(podUpdate.podName)
    if err != nil {
        return nil // Pod already deleted
    }

    node, err := tc.nodeLister.Get(pod.Spec.NodeName)
    if err != nil {
        return err
    }

    allTolerations := pod.Spec.Tolerations
    usedTolerations, _ :=
        v1helper.GetMatchingTolerations(
            node.Spec.Taints, allTolerations)

    if !v1helper.TolerationsTolerateTaintsWithFilter(
        usedTolerations, node.Spec.Taints,
        func(t *v1.Taint) bool {
            return t.Effect == v1.TaintEffectNoExecute
        }) {
        // Schedule eviction
        tc.taintEvictionQueue.AddWork(
            ctx, types.NamespacedName{
                Namespace: pod.Namespace,
                Name:      pod.Name,
            }, 0)
    }
    return nil
}`,
          calledBy: ['Controller.podUpdated'],
          calls: ['GetMatchingTolerations', 'taintEvictionQueue.AddWork'],
        },
      ],
    },
  ],
  edges: [
    {
      id: 'e-types-prober',
      sourceFileId: 'types',
      targetFileId: 'prober_manager',
      label: '定义 Pod/Container 类型',
      callType: 'direct',
      functions: ['PodConditionType', 'ContainerStatus'],
    },
    {
      id: 'e-prober-worker',
      sourceFileId: 'prober_manager',
      targetFileId: 'worker',
      label: '启动探针 Worker',
      callType: 'direct',
      functions: ['AddPod', 'newWorker', 'run'],
    },
    {
      id: 'e-worker-generate',
      sourceFileId: 'worker',
      targetFileId: 'generate',
      label: '上报探针结果',
      callType: 'event',
      functions: ['doProbe', 'resultsManager.Set'],
    },
    {
      id: 'e-generate-status',
      sourceFileId: 'generate',
      targetFileId: 'status_manager',
      label: '生成 Ready 条件',
      callType: 'direct',
      functions: ['GeneratePodReadyCondition', 'SetPodStatus'],
    },
    {
      id: 'e-status-apiserver',
      sourceFileId: 'status_manager',
      targetFileId: 'pod_util',
      label: 'PATCH 状态到 API Server',
      callType: 'http',
      functions: ['syncPod', 'PatchPodStatus'],
    },
    {
      id: 'e-types-lifecycle',
      sourceFileId: 'types',
      targetFileId: 'node_lifecycle',
      label: '定义 Node 条件和 Taint 类型',
      callType: 'direct',
      functions: ['NodeConditionType', 'TaintEffect'],
    },
    {
      id: 'e-lifecycle-taint',
      sourceFileId: 'node_lifecycle',
      targetFileId: 'taint_eviction',
      label: '应用 NoExecute 污点',
      callType: 'watch',
      functions: ['monitorNodeHealth', 'processTaintBaseEviction'],
    },
    {
      id: 'e-pod-util-lifecycle',
      sourceFileId: 'pod_util',
      targetFileId: 'node_lifecycle',
      label: '节点状态变更触发',
      callType: 'watch',
      functions: ['IsPodReady', 'monitorNodeHealth'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 2: kubeadm init
// ---------------------------------------------------------------------------

const kubeadmInitChain: K8sAnalysisChain = {
  id: 'kubeadm-init',
  name: '新建集群链路 (kubeadm init)',
  description:
    'kubeadm init 创建新 Kubernetes 集群的完整代码路径。从命令入口开始，经历预检、证书生成、etcd 部署、控制平面组件启动、Kubelet 配置、Bootstrap Token 创建到 Addon 部署的全流程。',
  version: 'v1.35.0',
  totalFiles: 9,
  totalFunctions: 15,
  totalLinesOfCode: 6850,
  chainType: 'initialization',
  topology: 'sequential-pipeline',
  callTypeDistribution: { direct: 8, grpc: 0, http: 1, event: 0, watch: 0 } satisfies K8sCallTypeDistribution,
  components: ['kubeadm', 'api-server', 'controller-manager'],
  tags: ['集群初始化', '顺序流水线', '阶段化执行', 'Phase Runner 模式'],
  flowSteps: [
    'kubeadm init 命令解析配置和参数，执行预检验证系统环境',
    '生成 CA、API Server、Controller Manager、Scheduler 等全套 PKI 证书',
    '创建 etcd 静态 Pod 清单，启动本地 etcd 实例',
    '生成 kube-apiserver、kube-controller-manager、kube-scheduler 静态 Pod 清单',
    'API Server 通过静态 Pod 清单启动，初始化 RESTful API 服务',
    'Controller Manager 启动，注册并运行所有内置控制器',
    '配置 Kubelet，写入 kubeconfig 和启动参数',
    '创建 Bootstrap Token，用于后续节点加入集群的认证',
    '部署 CoreDNS 和 kube-proxy 等集群 Addon',
  ],
  sourceFiles: [
    {
      id: 'init',
      filePath: 'cmd/kubeadm/app/cmd/init.go',
      fileName: 'init.go',
      package: 'cmd',
      component: 'kubeadm',
      description: 'kubeadm init 命令的入口文件，定义 cobra 命令和 phase runner 执行流程',
      linesOfCode: 520,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'NewCmdInit',
          signature: 'func NewCmdInit(out io.Writer, initOptions *initOptions) *cobra.Command',
          description: '创建 kubeadm init 命令对象，注册所有 phase 和命令行参数',
          codeSnippet: `func NewCmdInit(out io.Writer,
    initOptions *initOptions) *cobra.Command {
    if initOptions == nil {
        initOptions = newInitOptions()
    }
    initRunner := workflow.NewRunner()

    cmd := &cobra.Command{
        Use:   "init",
        Short: "Initialize a Kubernetes control-plane node",
        RunE: func(cmd *cobra.Command, args []string) error {
            c, err := initRunner.InitData(args)
            if err != nil {
                return err
            }
            err = initRunner.Run(args)
            if err != nil {
                return err
            }
            return showJoinCommand(c, out)
        },
    }

    // Register phases
    initRunner.AppendPhase(phases.NewPreflightPhase())
    initRunner.AppendPhase(phases.NewCertsPhase())
    initRunner.AppendPhase(phases.NewKubeConfigPhase())
    initRunner.AppendPhase(phases.NewEtcdPhase())
    initRunner.AppendPhase(phases.NewControlPlanePhase())
    initRunner.AppendPhase(phases.NewKubeletStartPhase())
    return cmd
}`,
          calledBy: ['main'],
          calls: ['workflow.NewRunner', 'initRunner.Run'],
        },
      ],
    },
    {
      id: 'certs',
      filePath: 'cmd/kubeadm/app/phases/certs/certs.go',
      fileName: 'certs.go',
      package: 'certs',
      component: 'kubeadm',
      description: '证书生成阶段，创建包含 CA、API Server、Front-Proxy、etcd 在内的全套 PKI 证书',
      linesOfCode: 680,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'CreatePKIAssets',
          signature: 'func CreatePKIAssets(cfg *kubeadmapi.InitConfiguration) error',
          description: '创建所有 PKI 资产 — CA 证书、API Server 证书、kubelet 客户端证书、SA 密钥对等',
          codeSnippet: `func CreatePKIAssets(
    cfg *kubeadmapi.InitConfiguration) error {
    // Create the CA certificate and key
    caCert, caKey, err := pkiutil.NewCertificateAuthority(
        &certutil.Config{CommonName: "kubernetes"})
    if err != nil {
        return err
    }
    if err := writeCertAndKey(
        cfg.CertificatesDir, "ca", caCert, caKey); err != nil {
        return err
    }

    // Create the API server serving certificate
    apiCert, apiKey, err := pkiutil.NewCertAndKey(
        caCert, caKey, apiServerCertConfig(cfg))
    if err != nil {
        return err
    }
    if err := writeCertAndKey(
        cfg.CertificatesDir,
        "apiserver", apiCert, apiKey); err != nil {
        return err
    }
    // ... front-proxy, etcd, sa key pair ...
    return nil
}`,
          calledBy: ['initRunner.Run'],
          calls: ['pkiutil.NewCertificateAuthority', 'pkiutil.NewCertAndKey', 'writeCertAndKey'],
        },
      ],
    },
    {
      id: 'etcd',
      filePath: 'cmd/kubeadm/app/phases/etcd/local.go',
      fileName: 'local.go',
      package: 'etcd',
      component: 'kubeadm',
      description: '本地 etcd 部署阶段，生成 etcd 静态 Pod 清单到 /etc/kubernetes/manifests/',
      linesOfCode: 320,
      importance: 'high',
      keyFunctions: [
        {
          name: 'CreateLocalEtcdStaticPodManifestFile',
          signature: 'func CreateLocalEtcdStaticPodManifestFile(manifestDir, patchesDir string, nodeName string, cfg *kubeadmapi.ClusterConfiguration, endpoint *kubeadmapi.APIEndpoint) error',
          description: '生成 etcd 静态 Pod 清单文件，包含数据目录、证书挂载和集群配置',
          codeSnippet: `func CreateLocalEtcdStaticPodManifestFile(
    manifestDir, patchesDir string,
    nodeName string,
    cfg *kubeadmapi.ClusterConfiguration,
    endpoint *kubeadmapi.APIEndpoint,
) error {
    spec := GetEtcdPodSpec(cfg, endpoint, nodeName, nil)

    // Apply user-provided patches if any
    if patchesDir != "" {
        patchedSpec, err := applyPatchesForComponent(
            patchesDir, "etcd", spec)
        if err != nil {
            return err
        }
        spec = patchedSpec
    }

    return staticpodutil.WriteStaticPodToDisk(
        componentEtcd, manifestDir, spec)
}`,
          calledBy: ['initRunner.Run'],
          calls: ['GetEtcdPodSpec', 'WriteStaticPodToDisk'],
        },
      ],
    },
    {
      id: 'controlplane',
      filePath: 'cmd/kubeadm/app/phases/controlplane/manifests.go',
      fileName: 'manifests.go',
      package: 'controlplane',
      component: 'kubeadm',
      description: '控制平面组件部署阶段，为 kube-apiserver、kube-controller-manager、kube-scheduler 生成静态 Pod 清单',
      linesOfCode: 580,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'CreateStaticPodFiles',
          signature: 'func CreateStaticPodFiles(manifestDir, patchesDir string, cfg *kubeadmapi.ClusterConfiguration, endpoint *kubeadmapi.APIEndpoint, components ...string) error',
          description: '为指定的控制平面组件生成静态 Pod 清单文件',
          codeSnippet: `func CreateStaticPodFiles(
    manifestDir, patchesDir string,
    cfg *kubeadmapi.ClusterConfiguration,
    endpoint *kubeadmapi.APIEndpoint,
    components ...string,
) error {
    specs := GetStaticPodSpecs(cfg, endpoint)

    for _, component := range components {
        spec, exists := specs[component]
        if !exists {
            return fmt.Errorf(
                "unknown component: %s", component)
        }

        if patchesDir != "" {
            patchedSpec, err :=
                applyPatchesForComponent(
                    patchesDir, component, spec)
            if err != nil {
                return err
            }
            spec = patchedSpec
        }

        if err := staticpodutil.WriteStaticPodToDisk(
            component, manifestDir, spec); err != nil {
            return err
        }
    }
    return nil
}`,
          calledBy: ['initRunner.Run'],
          calls: ['GetStaticPodSpecs', 'WriteStaticPodToDisk'],
        },
        {
          name: 'GetStaticPodSpecs',
          signature: 'func GetStaticPodSpecs(cfg *kubeadmapi.ClusterConfiguration, endpoint *kubeadmapi.APIEndpoint) map[string]v1.Pod',
          description: '构建 API Server、Controller Manager、Scheduler 三个组件的 Pod Spec',
          codeSnippet: `func GetStaticPodSpecs(
    cfg *kubeadmapi.ClusterConfiguration,
    endpoint *kubeadmapi.APIEndpoint,
) map[string]v1.Pod {
    staticPodSpecs := map[string]v1.Pod{
        kubeadmconstants.KubeAPIServer:
            staticpodutil.ComponentPod(
                getAPIServerCommand(cfg, endpoint),
                getAPIServerVolumes(cfg),
                componentLabels(kubeadmconstants.KubeAPIServer),
            ),
        kubeadmconstants.KubeControllerManager:
            staticpodutil.ComponentPod(
                getControllerManagerCommand(cfg),
                getControllerManagerVolumes(cfg),
                componentLabels(
                    kubeadmconstants.KubeControllerManager),
            ),
        kubeadmconstants.KubeScheduler:
            staticpodutil.ComponentPod(
                getSchedulerCommand(cfg),
                getSchedulerVolumes(cfg),
                componentLabels(
                    kubeadmconstants.KubeScheduler),
            ),
    }
    return staticPodSpecs
}`,
          calledBy: ['CreateStaticPodFiles'],
          calls: ['staticpodutil.ComponentPod', 'getAPIServerCommand'],
        },
      ],
    },
    {
      id: 'apiserver',
      filePath: 'cmd/kube-apiserver/app/server.go',
      fileName: 'server.go',
      package: 'app',
      component: 'api-server',
      description: 'kube-apiserver 启动入口，初始化 RESTful API 服务、认证鉴权、Admission Controller 等',
      linesOfCode: 820,
      importance: 'critical',
      keyFunctions: [
        {
          name: 'Run',
          signature: 'func Run(opts options.CompletedOptions, stopCh <-chan struct{}) error',
          description: 'API Server 主启动函数 — 创建 server chain，启动 HTTPS 监听',
          codeSnippet: `func Run(opts options.CompletedOptions,
    stopCh <-chan struct{}) error {
    // Create the server chain
    config, err := CreateServerChain(opts)
    if err != nil {
        return err
    }

    server, err := config.Complete().New(
        "kube-apiserver",
        genericapiserver.NewEmptyDelegate())
    if err != nil {
        return err
    }

    prepared, err := server.PrepareRun()
    if err != nil {
        return err
    }

    return prepared.Run(stopCh)
}`,
          calledBy: ['main', 'kubelet (static pod)'],
          calls: ['CreateServerChain', 'server.PrepareRun'],
        },
      ],
    },
    {
      id: 'controller_mgr',
      filePath: 'cmd/kube-controller-manager/app/controllermanager.go',
      fileName: 'controllermanager.go',
      package: 'app',
      component: 'controller-manager',
      description: 'kube-controller-manager 启动入口，注册并运行 Node、Deployment、Service 等所有内置控制器',
      linesOfCode: 640,
      importance: 'high',
      keyFunctions: [
        {
          name: 'Run',
          signature: 'func Run(ctx context.Context, c *config.CompletedConfig) error',
          description: 'Controller Manager 主启动函数 — 选举 leader 后启动所有控制器',
          codeSnippet: `func Run(ctx context.Context,
    c *config.CompletedConfig) error {
    // Setup health checks and leader election
    run := func(ctx context.Context,
        controllerDescriptors map[string]*ControllerDescriptor) {
        controllerContext, err :=
            CreateControllerContext(ctx, c, rootClientBuilder)
        if err != nil {
            klog.Fatalf("error: %v", err)
        }

        if err := StartControllers(ctx,
            controllerContext, controllerDescriptors,
            NewControllerInitializers()); err != nil {
            klog.Fatalf("error starting controllers: %v",
                err)
        }
        controllerContext.InformerFactory.Start(ctx.Done())
    }

    // Leader election
    leaderelection.RunOrDie(ctx,
        *c.ComponentConfig.Generic.LeaderElection,
        leaderelection.LeaderCallbacks{
            OnStartedLeading: func(ctx context.Context) {
                run(ctx, c.ControllerDescriptors)
            },
        })
    return nil
}`,
          calledBy: ['main', 'kubelet (static pod)'],
          calls: ['CreateControllerContext', 'StartControllers', 'leaderelection.RunOrDie'],
        },
      ],
    },
    {
      id: 'kubelet_phase',
      filePath: 'cmd/kubeadm/app/phases/kubelet/kubelet.go',
      fileName: 'kubelet.go',
      package: 'kubelet',
      component: 'kubeadm',
      description: 'Kubelet 配置阶段，写入 kubelet 配置文件和启动参数到节点',
      linesOfCode: 280,
      importance: 'high',
      keyFunctions: [
        {
          name: 'WriteKubeletConfigToDisk',
          signature: 'func WriteKubeletConfigToDisk(cfg *kubeletconfig.KubeletConfiguration, kubeletDir string) error',
          description: '将 Kubelet 配置序列化为 YAML 并写入 /var/lib/kubelet/config.yaml',
          codeSnippet: `func WriteKubeletConfigToDisk(
    cfg *kubeletconfig.KubeletConfiguration,
    kubeletDir string,
) error {
    kubeletBytes, err := kubeletcodec.EncodeKubeletConfig(
        cfg, kubeletconfigv1beta1.SchemeGroupVersion)
    if err != nil {
        return err
    }

    return writeConfigBytesToDisk(
        kubeletBytes,
        filepath.Join(kubeletDir,
            kubeadmconstants.KubeletConfigurationFileName),
    )
}`,
          calledBy: ['initRunner.Run'],
          calls: ['kubeletcodec.EncodeKubeletConfig', 'writeConfigBytesToDisk'],
        },
      ],
    },
    {
      id: 'bootstraptoken',
      filePath: 'cmd/kubeadm/app/phases/bootstraptoken/bootstraptoken.go',
      fileName: 'bootstraptoken.go',
      package: 'bootstraptoken',
      component: 'kubeadm',
      description: 'Bootstrap Token 创建阶段，在 kube-system namespace 创建用于节点加入的认证令牌',
      linesOfCode: 180,
      importance: 'medium',
      keyFunctions: [
        {
          name: 'CreateNewTokens',
          signature: 'func CreateNewTokens(client clientset.Interface, tokens []bootstraptokenv1.BootstrapToken) error',
          description: '创建 Bootstrap Token Secret，格式为 {6chars}.{16chars}，用于新节点 join 认证',
          codeSnippet: `func CreateNewTokens(
    client clientset.Interface,
    tokens []bootstraptokenv1.BootstrapToken,
) error {
    for _, token := range tokens {
        secretName := bootstraputil.BootstrapTokenSecretName(
            token.Token.ID)
        secret := &v1.Secret{
            ObjectMeta: metav1.ObjectMeta{
                Name:      secretName,
                Namespace: metav1.NamespaceSystem,
            },
            Type: bootstrapapi.SecretTypeBootstrapToken,
            Data: encodeTokenSecretData(&token),
        }

        if _, err := client.CoreV1().Secrets(
            metav1.NamespaceSystem).Create(
            context.TODO(), secret,
            metav1.CreateOptions{}); err != nil {
            if !apierrors.IsAlreadyExists(err) {
                return err
            }
        }
    }
    return nil
}`,
          calledBy: ['initRunner.Run'],
          calls: ['encodeTokenSecretData', 'client.CoreV1.Secrets.Create'],
        },
      ],
    },
    {
      id: 'addons',
      filePath: 'cmd/kubeadm/app/phases/addons/addons.go',
      fileName: 'addons.go',
      package: 'addons',
      component: 'kubeadm',
      description: 'Addon 部署阶段，部署 CoreDNS 和 kube-proxy 等集群核心插件',
      linesOfCode: 420,
      importance: 'medium',
      keyFunctions: [
        {
          name: 'EnsureAddons',
          signature: 'func EnsureAddons(cfg *kubeadmapi.ClusterConfiguration, client clientset.Interface) error',
          description: '确保 CoreDNS Deployment 和 kube-proxy DaemonSet 已部署到集群中',
          codeSnippet: `func EnsureAddons(
    cfg *kubeadmapi.ClusterConfiguration,
    client clientset.Interface,
) error {
    // Deploy CoreDNS
    if err := coreDNSAddon(cfg, client); err != nil {
        return fmt.Errorf(
            "error ensuring CoreDNS addon: %v", err)
    }

    // Deploy kube-proxy
    if err := kubeProxyAddon(cfg, client); err != nil {
        return fmt.Errorf(
            "error ensuring kube-proxy addon: %v", err)
    }

    klog.V(1).InfoS(
        "Successfully ensured all addons")
    return nil
}`,
          calledBy: ['initRunner.Run'],
          calls: ['coreDNSAddon', 'kubeProxyAddon'],
        },
      ],
    },
  ],
  edges: [
    {
      id: 'e-init-certs',
      sourceFileId: 'init',
      targetFileId: 'certs',
      label: 'Phase: 生成证书',
      callType: 'direct',
      functions: ['NewCmdInit', 'CreatePKIAssets'],
    },
    {
      id: 'e-certs-etcd',
      sourceFileId: 'certs',
      targetFileId: 'etcd',
      label: 'Phase: 部署 etcd',
      callType: 'direct',
      functions: ['CreateLocalEtcdStaticPodManifestFile'],
    },
    {
      id: 'e-etcd-controlplane',
      sourceFileId: 'etcd',
      targetFileId: 'controlplane',
      label: 'Phase: 控制平面清单',
      callType: 'direct',
      functions: ['CreateStaticPodFiles'],
    },
    {
      id: 'e-controlplane-apiserver',
      sourceFileId: 'controlplane',
      targetFileId: 'apiserver',
      label: '静态 Pod 启动 API Server',
      callType: 'direct',
      functions: ['GetStaticPodSpecs', 'Run'],
    },
    {
      id: 'e-controlplane-ctrlmgr',
      sourceFileId: 'controlplane',
      targetFileId: 'controller_mgr',
      label: '静态 Pod 启动 Controller Manager',
      callType: 'direct',
      functions: ['GetStaticPodSpecs', 'Run'],
    },
    {
      id: 'e-controlplane-kubelet',
      sourceFileId: 'controlplane',
      targetFileId: 'kubelet_phase',
      label: 'Phase: 配置 Kubelet',
      callType: 'direct',
      functions: ['WriteKubeletConfigToDisk'],
    },
    {
      id: 'e-kubelet-bootstrap',
      sourceFileId: 'kubelet_phase',
      targetFileId: 'bootstraptoken',
      label: 'Phase: 创建 Bootstrap Token',
      callType: 'direct',
      functions: ['CreateNewTokens'],
    },
    {
      id: 'e-bootstrap-addons',
      sourceFileId: 'bootstraptoken',
      targetFileId: 'addons',
      label: 'Phase: 部署 Addon',
      callType: 'direct',
      functions: ['EnsureAddons'],
    },
    {
      id: 'e-addons-apiserver',
      sourceFileId: 'addons',
      targetFileId: 'apiserver',
      label: '通过 API 创建资源',
      callType: 'http',
      functions: ['coreDNSAddon', 'kubeProxyAddon'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Corpus Metadata
// ---------------------------------------------------------------------------

export const K8S_CORPUS: K8sCorpusMetadata = {
  kubernetesVersion: 'v1.35.0',
  analysisDate: '2026-04-15',
  chains: [podNotReadyChain, kubeadmInitChain],
};
