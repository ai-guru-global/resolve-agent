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
    locales: ['zh', 'en'],
    localeConfigs: {
      zh: {
        label: '简体中文',
      },
      en: {
        label: 'English',
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
            'https://github.com/ai-guru-global/resolve-agent/tree/main/docs-site/',
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/ai-guru-global/resolve-agent/tree/main/docs-site/',
        },
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
        {to: '/blog', label: '博客', position: 'left'},
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
              to: '/docs/user-guide/quickstart',
            },
            {
              label: '架构设计',
              to: '/docs/architecture/overview',
            },
            {
              label: 'API 参考',
              to: '/docs/api/index',
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
            {
              label: 'Slack',
              href: 'https://resolveagent.slack.com',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '博客',
              to: '/blog',
            },
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
