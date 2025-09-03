# Claude Code Subagents - Capability Matrix

## Comprehensive Agent Capability Comparison

### Development & Architecture Agents
| Agent | Model | Primary Skills | Secondary Skills | Output Types | Best For |
|-------|-------|---------------|------------------|--------------|----------|
| **backend-architect** | Sonnet | API Design, Microservices, Database Schema | Caching, Security Patterns, Scaling | API Specs, ERDs, Architecture Diagrams | System design, API architecture |
| **frontend-developer** | Sonnet | React/Vue/Angular, State Management, Responsive Design | Accessibility, CSS, Testing | Components, UI Code, Test Suites | Web UI implementation |
| **ui-ux-designer** | Sonnet | Wireframing, Design Systems, User Journeys | Prototyping, Interaction Design | Mockups, Style Guides, Design Tokens | Interface design, UX planning |
| **mobile-developer** | Sonnet | React Native, Flutter, Mobile Optimization | Push Notifications, Native Integration | Mobile Apps, Config Files | Cross-platform mobile apps |
| **graphql-architect** | Sonnet | GraphQL Schema, Resolvers, Federation | Caching, Subscriptions, Performance | Schema Files, Resolver Code | GraphQL API design |
| **architect-reviewer** | Opus | Pattern Recognition, Technical Debt, Scalability | Security Review, SOLID Principles | Review Reports, Recommendations | Architecture validation |

### Language Specialist Agents
| Agent | Model | Language Version | Frameworks | Testing Tools | Specialties |
|-------|-------|-----------------|------------|---------------|-------------|
| **python-pro** | Sonnet | Python 3.9+ | Django, FastAPI, Flask | pytest, unittest | Async, Decorators, Type Hints |
| **javascript-pro** | Sonnet | ES6+ | React, Vue, Express | Jest, Mocha | Promises, Node.js, V8 |
| **typescript-pro** | Sonnet | TypeScript 4+ | Angular, NestJS | Jest, ts-jest | Generics, Strict Types |
| **golang-pro** | Sonnet | Go 1.18+ | Gin, Echo | Go test | Goroutines, Channels |
| **rust-pro** | Sonnet | Rust 2021 | Actix, Tokio | cargo test | Memory Safety, Lifetimes |
| **java-pro** | Sonnet | Java 11+ | Spring Boot | JUnit, Mockito | Streams, Concurrency |
| **csharp-pro** | Sonnet | C# 10+ | ASP.NET Core | xUnit, NUnit | LINQ, async/await |
| **ruby-pro** | Sonnet | Ruby 3+ | Rails, Sinatra | RSpec, Minitest | Metaprogramming, DSLs |
| **php-pro** | Sonnet | PHP 8+ | Laravel, Symfony | PHPUnit | PSR Standards, Composer |
| **c-pro** | Sonnet | C11/C17 | - | Unity, CUnit | Memory Management, POSIX |
| **cpp-pro** | Sonnet | C++17/20 | STL, Boost | Google Test | Templates, RAII |
| **scala-pro** | Sonnet | Scala 3 | Akka, Spark, Play | ScalaTest | Functional, Actors |
| **elixir-pro** | Sonnet | Elixir 1.13+ | Phoenix | ExUnit | OTP, LiveView |
| **flutter-expert** | Sonnet | Dart 2.17+ | Flutter SDK | Flutter test | Widgets, State Management |
| **unity-developer** | Sonnet | C# for Unity | Unity Engine | Unity Test | Game Dev, Physics |
| **minecraft-bukkit-pro** | Sonnet | Java | Bukkit/Spigot | JUnit | Events, Commands |
| **ios-developer** | Sonnet | Swift 5+ | SwiftUI, UIKit | XCTest | Core Data, CloudKit |
| **sql-pro** | Sonnet | SQL:2016 | - | - | Query Optimization, Indexes |

### Infrastructure & Operations Agents
| Agent | Model | Primary Domain | Tools/Platforms | Monitoring | Automation |
|-------|-------|---------------|-----------------|------------|------------|
| **devops-troubleshooter** | Sonnet | Incident Response, Debugging | ELK, Datadog, kubectl | Logs, Metrics, Traces | Runbooks, Scripts |
| **cloud-architect** | Opus | AWS, Azure, GCP | Terraform, CloudFormation | CloudWatch, Azure Monitor | IaC, Cost Optimization |
| **kubernetes-architect** | Opus | K8s, Container Orchestration | Helm, ArgoCD, Istio | Prometheus, Grafana | GitOps, Multi-cluster |
| **database-optimizer** | Sonnet | Query Performance, Indexing | PostgreSQL, MySQL, MongoDB | Query Plans, Metrics | Index Strategies |
| **database-admin** | Sonnet | Backup, Replication, Operations | pg_dump, mysqldump | Monitoring Tools | Automation Scripts |
| **terraform-specialist** | Sonnet | Infrastructure as Code | Terraform, Providers | State Management | Modules, Drift Detection |
| **network-engineer** | Sonnet | Networking, Load Balancing | nginx, HAProxy, CDN | Network Monitoring | SSL/TLS, DNS |
| **deployment-engineer** | Sonnet | CI/CD Pipelines | GitHub Actions, Jenkins | Pipeline Metrics | Blue-Green, Canary |
| **incident-responder** | Opus | Crisis Management, RCA | Incident Tools | SLAs, SLOs | Post-mortems |
| **dx-optimizer** | Sonnet | Developer Experience | Dev Tools, IDEs | Productivity Metrics | Workflow Automation |
| **hybrid-cloud-architect** | Opus | Multi-Cloud, On-Premise | VMware, OpenStack | Unified Monitoring | Migration Strategies |

### Quality & Security Agents
| Agent | Model | Focus Area | Standards | Tools | Deliverables |
|-------|-------|-----------|-----------|-------|--------------|
| **security-auditor** | Opus | Vulnerability Assessment | OWASP, SOC2, PCI-DSS | SAST, DAST | Audit Reports, Fixes |
| **code-reviewer** | Sonnet | Code Quality, Best Practices | Language Standards | Linters, Analyzers | Review Comments |
| **test-automator** | Sonnet | Test Coverage, Automation | Testing Pyramids | Jest, Cypress, Selenium | Test Suites |
| **performance-engineer** | Opus | Optimization, Profiling | Performance Budgets | Profilers, Load Testing | Optimization Reports |
| **debugger** | Sonnet | Bug Investigation | Debug Protocols | Debuggers, Profilers | Root Cause Analysis |
| **error-detective** | Sonnet | Log Analysis, Patterns | Log Formats | grep, awk, ELK | Error Reports |
| **search-specialist** | Haiku | Research, Information | Search Techniques | Search Engines | Research Summary |

### Data & AI Agents
| Agent | Model | Specialization | Technologies | Frameworks | Use Cases |
|-------|-------|---------------|--------------|------------|-----------|
| **data-scientist** | Haiku | Analytics, SQL | BigQuery, SQL | pandas, numpy | Data Analysis, Reports |
| **data-engineer** | Sonnet | ETL, Pipelines | Spark, Airflow | dbt, Kafka | Data Pipelines |
| **ai-engineer** | Opus | LLM Apps, RAG | Vector DBs | LangChain, OpenAI | AI Applications |
| **ml-engineer** | Sonnet | ML Models | Python, Cloud | TensorFlow, PyTorch | Model Development |
| **mlops-engineer** | Opus | ML Infrastructure | MLflow, Kubeflow | W&B, DVC | ML Pipelines |
| **prompt-engineer** | Opus | Prompt Design | LLMs | Prompt Libraries | Prompt Optimization |

### Specialized Domain Agents
| Agent | Model | Domain | Key Skills | Integration | Output |
|-------|-------|--------|------------|-------------|--------|
| **api-documenter** | Haiku | Documentation | OpenAPI, Swagger | Postman | API Docs |
| **payment-integration** | Sonnet | Payments | Stripe, PayPal | Webhooks, PCI | Payment Code |
| **quant-analyst** | Opus | Finance | Trading, Risk | Python, R | Financial Models |
| **risk-manager** | Opus | Risk Assessment | Portfolio Analysis | Risk Metrics | Risk Reports |
| **legacy-modernizer** | Sonnet | Migration | Refactoring Patterns | Gradual Migration | Migration Plans |
| **context-manager** | Opus | Orchestration | Multi-Agent Coordination | State Management | Workflow Management |

### Documentation Agents
| Agent | Model | Documentation Type | Tools | Format | Audience |
|-------|-------|-------------------|-------|--------|----------|
| **docs-architect** | Opus | Technical Documentation | Markdown, Analysis | Comprehensive Docs | Developers, Architects |
| **mermaid-expert** | Sonnet | Diagrams | Mermaid.js | Diagrams, Charts | Technical Teams |
| **reference-builder** | Haiku | API Reference | Documentation Tools | Reference Guides | Developers |
| **tutorial-engineer** | Opus | Educational Content | Step-by-step | Tutorials, Guides | Learners |

### Business & Marketing Agents
| Agent | Model | Business Function | Tools | Metrics | Deliverables |
|-------|-------|------------------|-------|---------|--------------|
| **business-analyst** | Haiku | Analytics, KPIs | Excel, BI Tools | Revenue, Growth | Reports, Dashboards |
| **content-marketer** | Haiku | Content Creation | CMS, SEO Tools | Engagement | Blog Posts, Social |
| **hr-pro** | Haiku | Human Resources | HRIS, ATS | Employee Metrics | Policies, Processes |
| **sales-automator** | Haiku | Sales Support | CRM | Conversion | Email Templates |
| **customer-support** | Haiku | Support | Ticketing Systems | Response Time | FAQs, Responses |
| **legal-advisor** | Haiku | Legal Documents | Compliance Tools | Compliance Rate | Legal Docs |

### SEO & Content Optimization Agents
| Agent | Model | SEO Focus | Analysis Type | Optimization | Output |
|-------|-------|-----------|---------------|--------------|--------|
| **seo-content-auditor** | Sonnet | Content Quality | E-E-A-T Analysis | Quality Score | Audit Reports |
| **seo-meta-optimizer** | Haiku | Meta Tags | Title, Description | CTR Optimization | Meta Content |
| **seo-keyword-strategist** | Haiku | Keywords | Density, LSI | Keyword Strategy | Keyword Lists |
| **seo-structure-architect** | Haiku | Structure | Headers, Schema | Structure Score | Markup Code |
| **seo-snippet-hunter** | Haiku | Snippets | Featured Snippets | SERP Features | Formatted Content |
| **seo-content-refresher** | Haiku | Freshness | Outdated Content | Update Strategy | Refresh Plans |
| **seo-cannibalization-detector** | Haiku | Conflicts | Keyword Overlap | Consolidation | Conflict Reports |
| **seo-authority-builder** | Sonnet | Authority | Trust Signals | E-E-A-T Score | Authority Strategy |
| **seo-content-writer** | Sonnet | Content | SEO Writing | Engagement | Optimized Content |
| **seo-content-planner** | Haiku | Strategy | Content Calendar | Planning | Content Plans |

## Agent Capability Scores (1-5 Scale)

### Core Competencies Matrix
| Agent Category | Code Generation | Architecture | Testing | Documentation | Performance | Security |
|----------------|----------------|--------------|---------|---------------|-------------|----------|
| **Development & Architecture** | 4 | 5 | 3 | 3 | 3 | 3 |
| **Language Specialists** | 5 | 3 | 4 | 3 | 4 | 3 |
| **Infrastructure** | 3 | 4 | 3 | 3 | 5 | 4 |
| **Quality & Security** | 2 | 3 | 5 | 3 | 4 | 5 |
| **Data & AI** | 4 | 4 | 3 | 3 | 4 | 3 |
| **Documentation** | 1 | 2 | 1 | 5 | 1 | 1 |
| **Business** | 1 | 1 | 1 | 4 | 2 | 2 |
| **SEO** | 2 | 1 | 1 | 3 | 3 | 1 |

## Agent Collaboration Matrix

### Strong Partnerships (Work Well Together)
| Primary Agent | Best Partners | Collaboration Type |
|---------------|---------------|-------------------|
| **backend-architect** | frontend-developer, database-optimizer, security-auditor | Full-stack development |
| **frontend-developer** | ui-ux-designer, backend-architect, test-automator | UI implementation |
| **security-auditor** | All development agents, deployment-engineer | Security review |
| **performance-engineer** | database-optimizer, language specialists | Optimization |
| **incident-responder** | devops-troubleshooter, error-detective | Crisis management |
| **ai-engineer** | prompt-engineer, ml-engineer, mlops-engineer | AI systems |
| **test-automator** | All development agents | Quality assurance |
| **code-reviewer** | All development agents | Code quality |

### Sequential Workflows (Order Matters)
| Workflow | Agent Sequence | Purpose |
|----------|---------------|---------|
| **API Development** | backend-architect ’ language-pro ’ test-automator ’ api-documenter | Complete API lifecycle |
| **Bug Fix** | debugger ’ error-detective ’ language-pro ’ test-automator | Systematic debugging |
| **Performance Fix** | performance-engineer ’ database-optimizer ’ language-pro | Optimization pipeline |
| **Security Implementation** | backend-architect ’ security-auditor ’ test-automator | Secure development |
| **Documentation** | docs-architect ’ mermaid-expert ’ tutorial-engineer | Complete documentation |

## Task Complexity vs Agent Model

### Task Complexity Mapping
| Complexity Level | Characteristics | Recommended Model | Example Agents |
|------------------|-----------------|-------------------|----------------|
| **Low (1-2)** | Templates, simple queries, basic docs | Haiku | data-scientist, api-documenter, business-analyst |
| **Medium (3-4)** | Code implementation, standard operations | Sonnet | language specialists, frontend-developer, test-automator |
| **High (5)** | Critical systems, security, complex architecture | Opus | security-auditor, ai-engineer, incident-responder |

### Cost-Benefit Analysis
| Model | Speed | Cost | Capability | Best Use Cases |
|-------|-------|------|------------|----------------|
| **Haiku** | Fast (1-2s) | Low ($) | Basic-Intermediate | High-volume, simple tasks |
| **Sonnet** | Medium (3-5s) | Medium ($$) | Intermediate-Advanced | Development, implementation |
| **Opus** | Slower (5-10s) | High ($$$) | Advanced-Expert | Critical, complex tasks |

## Agent Selection Decision Matrix

### By Project Phase
| Project Phase | Primary Agents | Secondary Agents | Model Mix |
|---------------|---------------|------------------|-----------|
| **Planning** | backend-architect, ui-ux-designer | business-analyst | Sonnet/Haiku |
| **Development** | Language specialists, frontend-developer | test-automator | Sonnet |
| **Testing** | test-automator, debugger | performance-engineer | Sonnet/Opus |
| **Security Review** | security-auditor, code-reviewer | architect-reviewer | Opus/Sonnet |
| **Deployment** | deployment-engineer, devops-troubleshooter | incident-responder | Sonnet/Opus |
| **Documentation** | docs-architect, api-documenter | tutorial-engineer | Opus/Haiku |
| **Maintenance** | debugger, legacy-modernizer | performance-engineer | Sonnet |

### By Industry/Domain
| Industry | Recommended Agents | Specialized Needs |
|----------|-------------------|-------------------|
| **Finance** | quant-analyst, risk-manager, security-auditor | Compliance, risk management |
| **E-commerce** | payment-integration, seo agents, performance-engineer | Payments, SEO, speed |
| **Gaming** | unity-developer, minecraft-bukkit-pro, performance-engineer | Game dev, optimization |
| **Enterprise** | java-pro, csharp-pro, cloud-architect | Scalability, compliance |
| **Startups** | full-stack agents, deployment-engineer | Rapid development |
| **AI/ML** | ai-engineer, ml-engineer, mlops-engineer | AI implementation |

## Performance Benchmarks

### Response Time Expectations
| Agent Type | Simple Task | Complex Task | Critical Task |
|------------|-------------|--------------|---------------|
| **Haiku Agents** | <2 seconds | 2-5 seconds | N/A |
| **Sonnet Agents** | 2-4 seconds | 4-8 seconds | 8-15 seconds |
| **Opus Agents** | 4-6 seconds | 8-12 seconds | 12-20 seconds |

### Token Efficiency
| Model | Avg Tokens/Task | Cost/1K Tokens | Monthly Budget (Est.) |
|-------|-----------------|----------------|----------------------|
| **Haiku** | 500-1000 | $0.25 | $50-100 |
| **Sonnet** | 1000-2000 | $1.00 | $200-400 |
| **Opus** | 2000-4000 | $5.00 | $500-1000 |

## Agent Evolution Roadmap

### Current Capabilities (v1.0)
- 76 specialized agents
- 3-tier model optimization
- Basic orchestration
- Manual agent selection

### Near-term Enhancements (v1.1)
- Improved auto-routing
- Agent memory/context
- Performance caching
- Workflow templates

### Future Vision (v2.0)
- ML-based agent selection
- Cross-agent learning
- Real-time collaboration
- Custom agent creation

---

*This capability matrix is updated regularly as agents evolve. For specific agent details, consult individual agent documentation.*