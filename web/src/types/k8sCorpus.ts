export type K8sChainId = 'pod-not-ready' | 'kubeadm-init';

export interface K8sFunctionSignature {
  name: string;
  signature: string;
  description: string;
  codeSnippet: string;
  calledBy: string[];
  calls: string[];
}

export interface K8sSourceFile {
  id: string;
  filePath: string;
  fileName: string;
  package: string;
  component: string;
  description: string;
  keyFunctions: K8sFunctionSignature[];
  linesOfCode: number;
  importance: 'critical' | 'high' | 'medium';
}

export interface K8sChainEdge {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  label: string;
  callType: 'direct' | 'grpc' | 'http' | 'event' | 'watch';
  functions: string[];
}

export interface K8sAnalysisChain {
  id: K8sChainId;
  name: string;
  description: string;
  version: string;
  sourceFiles: K8sSourceFile[];
  edges: K8sChainEdge[];
  flowSteps: string[];
  totalFiles: number;
  totalFunctions: number;
  totalLinesOfCode: number;
}

export interface K8sCorpusMetadata {
  kubernetesVersion: string;
  analysisDate: string;
  chains: K8sAnalysisChain[];
}
