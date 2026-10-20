import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ResolveAgent',
  tagline: 'Problem-Solving AIOps Agent | 面向问题解决的 AIOps 智能体',
  favicon: 'img/favicon.ico',

  url: 'https://ai-guru-global.github.io',
  baseUrl: '/resolve-agent/',

  organizationName: 'ai-guru-global',
  projectName: 'resolve-agent',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh',
    // en locale 待 i18n/ 翻译目录建立后启用（当前无 en 内容，构建会失败）
    locales: ['zh'],
    localeConfigs: {
      zh: {
        label: '简体中文',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/ai-guru-global/resolve-agent/tree/main/docs-site/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    navbar: {
      title: 'ResolveAgent',
      logo: {
        alt: 'ResolveAgent Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
        {
          type: 'doc',
          docId: 'api/index',
          position: 'left',
          label: 'API',
        },
        {
          type: 'doc',
          docId: 'dev-guide/index',
          position: 'left',
          label: '开发',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/ai-guru-global/resolve-agent',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '快速开始',
              to: '/docs/intro',
            },
            {
              label: '架构设计',
              href: 'https://github.com/ai-guru-global/resolve-agent/blob/main/docs/design/INDEX.md',
            },
            {
              label: 'API 参考',
              to: '/docs/api',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/ai-guru-global/resolve-agent/discussions',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/ai-guru-global/resolve-agent',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AI Guru Global. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'protobuf'],
    },
  } satisfies Preset.ThemeConfig,

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],
};

export default config;
