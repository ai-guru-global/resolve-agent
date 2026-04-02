import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            快速开始 →
          </Link>
          <Link
            className="button button--outline button--lg"
            to="https://github.com/ai-guru-global/resolve-agent"
            style={{marginLeft: '1rem', color: 'white', borderColor: 'white'}}>
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures(): ReactNode {
  const features = [
    {
      title: '🔧 专家技能',
      description: '可插拔的技能模块，提供领域专业知识和工具能力',
    },
    {
      title: '🌳 FTA 工作流',
      description: '故障树分析引擎，系统化诊断和解决问题',
    },
    {
      title: '📚 RAG 知识库',
      description: '检索增强生成，基于文档的智能问答',
    },
    {
      title: '💻 代码分析',
      description: '静态代码分析，发现潜在问题和优化点',
    },
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {features.map((feature, idx) => (
            <div key={idx} className="col col--3">
              <div className="text--center padding-horiz--md">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - AIOps Agent Platform`}
      description="Problem-Solving AIOps Agent | 面向问题解决的 AIOps 智能体">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
