import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// 内容唯一源在仓库根 docs/；本目录只保留引导 stub，新增内容请写进 docs/。
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {type: 'doc', label: '文档首页', id: 'intro'},
    {
      type: 'category',
      label: 'API 参考',
      items: ['api/index'],
    },
    {
      type: 'category',
      label: '开发者指南',
      items: [
        'dev-guide/index',
        'dev-guide/local-dev',
        'dev-guide/contributing',
        'dev-guide/testing',
      ],
    },
    {
      type: 'category',
      label: '运维手册',
      items: ['ops/index'],
    },
    {
      type: 'category',
      label: '架构决策',
      items: [
        'adr/001-why-multilang',
        'adr/002-gateway-choice',
      ],
    },
  ],
};

export default sidebars;
