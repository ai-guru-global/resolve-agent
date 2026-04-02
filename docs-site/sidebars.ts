import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '用户指南',
      items: [
        'user-guide/quickstart',
        'user-guide/installation',
        'user-guide/configuration',
      ],
    },
    {
      type: 'category',
      label: '架构设计',
      items: [
        'architecture/overview',
        'architecture/intelligent-selector',
        'architecture/fta-engine',
        'architecture/rag-pipeline',
        'architecture/agentscope-higress-integration',
      ],
    },
    {
      type: 'category',
      label: '开发者指南',
      items: [
        'dev-guide/index',
        'dev-guide/local-dev',
        'dev-guide/contributing',
        'dev-guide/testing',
        'dev-guide/debugging',
      ],
    },
    {
      type: 'category',
      label: 'API 参考',
      items: [
        'api/index',
        'api/rest',
        'api/grpc',
        'api/python-sdk',
      ],
    },
    {
      type: 'category',
      label: '运维手册',
      items: [
        'ops/index',
        'ops/deployment',
        'ops/monitoring',
        'ops/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: '架构决策',
      items: [
        'adr/001-why-multilang',
        'adr/002-gateway-choice',
        'adr/003-orchestration-framework',
      ],
    },
  ],
};

export default sidebars;
