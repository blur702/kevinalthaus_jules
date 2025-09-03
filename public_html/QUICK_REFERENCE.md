# Claude Code Subagents - Quick Reference Guide

## Agent Selection by Task Type

### =€ "I need to build something"
| Task | Primary Agent | Supporting Agents | Model |
|------|--------------|-------------------|-------|
| REST API | `backend-architect` | `database-optimizer`, `test-automator` | Sonnet |
| Web UI | `frontend-developer` | `ui-ux-designer`, `test-automator` | Sonnet |
| Mobile App | `mobile-developer` | `flutter-expert`, `ios-developer` | Sonnet |
| GraphQL API | `graphql-architect` | `backend-architect`, `security-auditor` | Sonnet |
| Game | `unity-developer` | `csharp-pro`, `performance-engineer` | Sonnet/Opus |
| Minecraft Plugin | `minecraft-bukkit-pro` | `java-pro`, `test-automator` | Sonnet |
| CLI Tool | `golang-pro` or `rust-pro` | `test-automator` | Sonnet |
| Data Pipeline | `data-engineer` | `database-optimizer`, `ml-engineer` | Sonnet |
| AI Application | `ai-engineer` | `prompt-engineer`, `mlops-engineer` | Opus |

### = "I need to fix or debug"
| Problem | Primary Agent | Supporting Agents | Model |
|---------|--------------|-------------------|-------|
| Production Outage | `incident-responder` | `devops-troubleshooter`, `error-detective` | Opus/Sonnet |
| Bug in Code | `debugger` | Language specialist, `test-automator` | Sonnet |
| Performance Issue | `performance-engineer` | `database-optimizer`, `network-engineer` | Opus/Sonnet |
| Security Vulnerability | `security-auditor` | `code-reviewer`, `deployment-engineer` | Opus/Sonnet |
| Database Slow | `database-optimizer` | `sql-pro`, `performance-engineer` | Sonnet |
| Network Problem | `network-engineer` | `devops-troubleshooter`, `incident-responder` | Sonnet/Opus |
| Container/K8s Issue | `kubernetes-architect` | `devops-troubleshooter`, `deployment-engineer` | Opus/Sonnet |

### =Ý "I need documentation"
| Documentation Type | Primary Agent | Supporting Agents | Model |
|-------------------|--------------|-------------------|-------|
| Technical Architecture | `docs-architect` | `mermaid-expert` | Opus/Sonnet |
| API Documentation | `api-documenter` | `reference-builder` | Haiku |
| Tutorials | `tutorial-engineer` | `docs-architect` | Opus |
| Diagrams | `mermaid-expert` | - | Sonnet |
| Reference Guide | `reference-builder` | `api-documenter` | Haiku |

### =¼ "I need business help"
| Business Need | Primary Agent | Supporting Agents | Model |
|---------------|--------------|-------------------|-------|
| Metrics/KPIs | `business-analyst` | `data-scientist` | Haiku |
| Marketing Content | `content-marketer` | SEO agents | Haiku/Sonnet |
| Sales Material | `sales-automator` | `content-marketer` | Haiku |
| Customer Support | `customer-support` | `content-marketer` | Haiku |
| HR/Hiring | `hr-pro` | `legal-advisor` | Haiku |
| Legal Documents | `legal-advisor` | `security-auditor` | Haiku/Opus |
| Financial Analysis | `quant-analyst` | `risk-manager` | Opus |

### = "I need security/compliance"
| Security Need | Primary Agent | Supporting Agents | Model |
|---------------|--------------|-------------------|-------|
| Security Audit | `security-auditor` | `code-reviewer` | Opus |
| Code Review | `code-reviewer` | `security-auditor` | Sonnet/Opus |
| Payment Integration | `payment-integration` | `security-auditor` | Sonnet/Opus |
| Auth System | `backend-architect` | `security-auditor` | Sonnet/Opus |
| Compliance Check | `legal-advisor` | `security-auditor` | Haiku/Opus |

### =„ "I need optimization"
| Optimization Type | Primary Agent | Supporting Agents | Model |
|-------------------|--------------|-------------------|-------|
| App Performance | `performance-engineer` | Language specialist | Opus |
| Database | `database-optimizer` | `sql-pro` | Sonnet |
| SEO | `seo-content-auditor` | Other SEO agents | Sonnet/Haiku |
| Cloud Costs | `cloud-architect` | `terraform-specialist` | Opus/Sonnet |
| Developer Experience | `dx-optimizer` | `deployment-engineer` | Sonnet |

## Language-Specific Quick Reference

### Web Development
```
Frontend: javascript-pro, typescript-pro, frontend-developer
Backend: Choose based on language below
Full-Stack: backend-architect + frontend-developer + database-optimizer
```

### By Programming Language
| Language | Agent | Best For | Frameworks |
|----------|-------|----------|------------|
| Python | `python-pro` | APIs, ML, Scripts | Django, FastAPI, Flask |
| JavaScript | `javascript-pro` | Web, Node.js | React, Vue, Express |
| TypeScript | `typescript-pro` | Type-safe web | Angular, NestJS |
| Go | `golang-pro` | Microservices, CLI | Gin, Echo, Cobra |
| Rust | `rust-pro` | Systems, WASM | Actix, Tokio |
| Java | `java-pro` | Enterprise | Spring Boot |
| C# | `csharp-pro` | .NET, Unity | ASP.NET Core |
| Ruby | `ruby-pro` | Web apps | Rails, Sinatra |
| PHP | `php-pro` | Web apps | Laravel, Symfony |
| C | `c-pro` | Embedded, OS | - |
| C++ | `cpp-pro` | Performance | STL, Boost |
| Scala | `scala-pro` | Big Data | Spark, Akka |
| Elixir | `elixir-pro` | Real-time | Phoenix, LiveView |
| SQL | `sql-pro` | Databases | PostgreSQL, MySQL |
| Dart/Flutter | `flutter-expert` | Mobile | Flutter SDK |
| Swift | `ios-developer` | iOS | SwiftUI, UIKit |

## Common Workflows

### <× New Feature Development
```bash
backend-architect ’ database-optimizer ’ [language-pro] ’ test-automator ’ security-auditor ’ deployment-engineer
```

### = Bug Fix
```bash
debugger ’ error-detective ’ [language-pro] ’ test-automator ’ code-reviewer
```

### =Ê Performance Optimization
```bash
performance-engineer ’ database-optimizer ’ [language-pro] ’ test-automator
```

### =¨ Production Incident
```bash
incident-responder ’ devops-troubleshooter ’ error-detective ’ [fix] ’ deployment-engineer
```

### = Legacy Modernization
```bash
legacy-modernizer ’ backend-architect ’ database-optimizer ’ test-automator
```

### > AI/ML Implementation
```bash
ai-engineer ’ prompt-engineer ’ ml-engineer ’ mlops-engineer ’ performance-engineer
```

## Model Selection Guide

### =€ Haiku (Fast, Cost-Effective)
**Use for**: Simple tasks, documentation, templates, queries
```
data-scientist, api-documenter, reference-builder, business-analyst,
content-marketer, customer-support, sales-automator, search-specialist,
legal-advisor, hr-pro, seo-meta-optimizer, seo-keyword-strategist,
seo-structure-architect, seo-snippet-hunter, seo-content-refresher,
seo-cannibalization-detector, seo-content-planner
```

### ¡ Sonnet (Balanced)
**Use for**: Development, debugging, standard operations
```
All language specialists (python-pro, javascript-pro, etc.)
frontend-developer, backend-architect, ui-ux-designer, mobile-developer,
graphql-architect, devops-troubleshooter, deployment-engineer,
database-optimizer, database-admin, terraform-specialist, network-engineer,
dx-optimizer, code-reviewer, test-automator, debugger, error-detective,
data-engineer, ml-engineer, payment-integration, legacy-modernizer,
mermaid-expert, seo-content-auditor, seo-authority-builder, seo-content-writer
```

### >à Opus (Maximum Capability)
**Use for**: Critical tasks, security, complex architecture, AI/ML
```
architect-reviewer, security-auditor, performance-engineer,
incident-responder, cloud-architect, hybrid-cloud-architect,
kubernetes-architect, ai-engineer, mlops-engineer, prompt-engineer,
context-manager, quant-analyst, risk-manager, docs-architect,
tutorial-engineer
```

## Explicit Invocation Examples

### Direct Agent Calls
```
"Use python-pro to refactor this function"
"Have security-auditor review this authentication flow"
"Get performance-engineer to optimize this query"
```

### Multi-Agent Coordination
```
"First backend-architect designs, then frontend-developer implements"
"Run code-reviewer and security-auditor in parallel"
"Use context-manager to coordinate this complex workflow"
```

### Conditional Routing
```
"If it's a frontend bug use frontend-developer, else use backend-architect"
"Have debugger analyze then route to appropriate specialist"
```

## SEO Specialists Quick Reference

| Agent | Purpose | Model |
|-------|---------|-------|
| `seo-content-auditor` | Analyze content quality, E-E-A-T | Sonnet |
| `seo-meta-optimizer` | Title tags, meta descriptions | Haiku |
| `seo-keyword-strategist` | Keyword research, density | Haiku |
| `seo-structure-architect` | Headers, schema markup | Haiku |
| `seo-snippet-hunter` | Featured snippets optimization | Haiku |
| `seo-content-refresher` | Update outdated content | Haiku |
| `seo-cannibalization-detector` | Find keyword conflicts | Haiku |
| `seo-authority-builder` | Build trust signals | Sonnet |
| `seo-content-writer` | Create optimized content | Sonnet |
| `seo-content-planner` | Content strategy, calendars | Haiku |

## Infrastructure Quick Reference

### Cloud Platforms
- **AWS/Azure/GCP**: `cloud-architect` (Opus)
- **Hybrid Cloud**: `hybrid-cloud-architect` (Opus)
- **Kubernetes**: `kubernetes-architect` (Opus)
- **Terraform**: `terraform-specialist` (Sonnet)

### DevOps Tools
- **CI/CD**: `deployment-engineer` (Sonnet)
- **Monitoring**: `devops-troubleshooter` (Sonnet)
- **Incidents**: `incident-responder` (Opus)
- **Networking**: `network-engineer` (Sonnet)

### Database Operations
- **Optimization**: `database-optimizer` (Sonnet)
- **Administration**: `database-admin` (Sonnet)
- **SQL Queries**: `sql-pro` (Sonnet)

## Testing & Quality

| Testing Type | Agent | Model |
|--------------|-------|-------|
| Unit Tests | `test-automator` | Sonnet |
| Integration Tests | `test-automator` | Sonnet |
| E2E Tests | `test-automator` | Sonnet |
| Performance Tests | `performance-engineer` | Opus |
| Security Tests | `security-auditor` | Opus |
| Code Quality | `code-reviewer` | Sonnet |
| Architecture Review | `architect-reviewer` | Opus |

## Decision Tree for Agent Selection

```
Start Here

  Building Something New?
    Web App ’ backend-architect + frontend-developer
    API Only ’ backend-architect + language-pro
    Mobile ’ mobile-developer or flutter-expert
    AI/ML ’ ai-engineer + ml-engineer

  Fixing a Problem?
    Bug ’ debugger + language-pro
    Performance ’ performance-engineer
    Security ’ security-auditor
    Production ’ incident-responder

  Need Documentation?
    Technical ’ docs-architect
    API ’ api-documenter
    Tutorial ’ tutorial-engineer
    Diagrams ’ mermaid-expert

  Business/Other?
     Analytics ’ business-analyst + data-scientist
     Marketing ’ content-marketer + SEO agents
     Legal/HR ’ legal-advisor or hr-pro
     Customer ’ customer-support
```

## Tips for Effective Agent Use

###  DO:
- Provide clear context and requirements
- Specify technology stack when relevant
- Use explicit agent names for precise control
- Combine agents for complex tasks
- Let agents work in parallel when possible

### L DON'T:
- Overload single agent with multiple domains
- Skip security review for production code
- Ignore test coverage
- Use Opus agents for simple tasks
- Forget to specify compliance requirements

## Emergency Contacts (Agents)

=¨ **Production Down**: `incident-responder` ’ `devops-troubleshooter`
= **Security Breach**: `security-auditor` ’ `incident-responder`
= **Critical Bug**: `debugger` ’ `error-detective`
=¥ **Performance Crisis**: `performance-engineer` ’ `database-optimizer`
=% **Database Issues**: `database-admin` ’ `database-optimizer`

---

*For detailed documentation, see AGENTS_DOCUMENTATION.md*
*For capability comparison, see CAPABILITY_MATRIX.md*