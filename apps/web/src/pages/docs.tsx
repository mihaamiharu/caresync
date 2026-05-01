import { useState, useMemo } from "react";
import { TEST_CASES, TestCase } from "./test-cases-data";
import { USER_FLOWS } from "./user-flows-data";
import { 
  Search, 
  Folder, 
  CheckCircle2, 
  PlayCircle, 
  X, 
  FileText,
  Activity,
  Shield,
  Clock,
  LayoutList,
  GitMerge,
  ArrowRight
} from "lucide-react";

export function TestCasesPage() {
  const [activeTab, setActiveTab] = useState<"test-cases" | "user-flows">("test-cases");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);

  // Derive categories and counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = { All: TEST_CASES.length };
    TEST_CASES.forEach((tc) => {
      counts[tc.category] = (counts[tc.category] || 0) + 1;
    });
    return Object.keys(counts);
  }, []);

  // Filter tests
  const filteredTests = useMemo(() => {
    return TEST_CASES.filter((tc) => {
      const matchesCategory = selectedCategory === "All" || tc.category === selectedCategory;
      const matchesSearch = tc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tc.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Metrics
  const totalTests = TEST_CASES.length;
  const automatedTests = TEST_CASES.filter(t => t.status === "Automated").length;
  const automatedPercentage = Math.round((automatedTests / totalTests) * 100);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[600px] bg-background border border-border/40 shadow-sm rounded-xl overflow-hidden">
      {/* Header / Topbar */}
        <header className="h-16 border-b border-border/40 bg-card/30 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">Documentation</h1>
              <p className="text-xs text-muted-foreground mt-1">Platform guides and testing</p>
            </div>
          </div>
          
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("test-cases")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === "test-cases" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Test Cases
            </button>
            <button
              onClick={() => setActiveTab("user-flows")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === "user-flows" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <GitMerge className="w-4 h-4" />
              User Flows
            </button>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Total Cases:
              </div>
              <span className="font-semibold">{totalTests}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Automated:
              </div>
              <span className="font-semibold text-emerald-500">{automatedPercentage}%</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "test-cases" ? (
            <>
          
          {/* Left Panel: Categories Tree */}
          <aside className="w-64 border-r border-border/40 bg-card/10 flex flex-col shrink-0">
            <div className="p-4 border-b border-border/40">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Modules</h2>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setSelectedTest(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === cat 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Folder className={`w-4 h-4 ${selectedCategory === cat ? "fill-primary/20" : ""}`} />
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded-full">
                      {cat === "All" ? TEST_CASES.length : TEST_CASES.filter(t => t.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center Panel: List */}
          <section className="flex-1 flex flex-col bg-background relative z-0 min-w-0">
            <div className="p-4 border-b border-border/40 flex items-center gap-4 bg-card/10">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search test cases by ID or Title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10 border-b border-border/40">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground w-20">ID</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground w-24">Status</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground w-24">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredTests.map((tc) => (
                    <tr 
                      key={tc.id} 
                      onClick={() => setSelectedTest(tc)}
                      className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                        selectedTest?.id === tc.id ? "bg-primary/5 hover:bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {tc.id}
                        </span>
                      </td>
                      <td className="px-6 py-3 truncate max-w-[200px] xl:max-w-[400px]">
                        <span className="font-medium text-foreground">{tc.title}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{tc.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          tc.priority === "P1" 
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}>
                          {tc.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredTests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        No test cases found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Panel: Detail View */}
          {selectedTest && (
            <aside className="w-96 border-l border-border/40 bg-card/20 flex flex-col shrink-0 transform transition-transform animate-in slide-in-from-right-8 duration-300 shadow-xl z-20 relative">
              <div className="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-background">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {selectedTest.id}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{selectedTest.category}</span>
                </div>
                <button 
                  onClick={() => setSelectedTest(null)}
                  className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 overflow-auto flex-1">
                <h3 className="text-xl font-semibold mb-4 text-foreground leading-tight">
                  {selectedTest.title}
                </h3>
                
                <div className="flex items-center gap-3 mb-8">
                   <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                      <PlayCircle className="w-3.5 h-3.5" />
                      {selectedTest.status}
                   </div>
                   <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedTest.priority}
                   </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Gherkin Scenario
                  </h4>
                  <div className="bg-background border border-border/50 rounded-lg p-4 font-mono text-sm leading-relaxed shadow-sm">
                    {selectedTest.gherkin.split('\n').map((line, i) => {
                      const isKeyword = line.trim().match(/^(Given|When|Then|And|But)\b/);
                      return (
                        <div key={i} className="mb-1 last:mb-0">
                          {isKeyword ? (
                            <>
                              <span className="text-primary font-bold">{isKeyword[1]}</span>
                              <span className="text-foreground">{line.substring(isKeyword[1].length)}</span>
                            </>
                          ) : (
                            <span className="text-foreground">{line}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          )}
          </>
          ) : (
            <UserFlowsView />
          )}
        </div>
    </div>
  );
}

function UserFlowsView() {
  const [selectedFlow, setSelectedFlow] = useState(USER_FLOWS[0]);

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* Left Panel: Flows List */}
      <aside className="w-80 border-r border-border/40 bg-card/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/40">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Core Journeys</h2>
          <div className="space-y-2">
            {USER_FLOWS.map((flow) => {
              const Icon = flow.icon;
              const isSelected = selectedFlow.id === flow.id;
              return (
                <button
                  key={flow.id}
                  onClick={() => setSelectedFlow(flow)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected 
                      ? "bg-primary/5 border-primary/20 shadow-sm" 
                      : "bg-background border-transparent hover:border-border/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`p-1.5 rounded-md ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? flow.color : "text-muted-foreground"}`} />
                    </div>
                    <span className={`font-semibold text-sm ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {flow.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-10">
                    {flow.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Right Panel: Flow Details */}
      <section className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <selectedFlow.icon className={`w-6 h-6 ${selectedFlow.color}`} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{selectedFlow.title}</h2>
            </div>
            <p className="text-lg text-muted-foreground">{selectedFlow.description}</p>
          </div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[27px] top-4 bottom-8 w-px bg-border/60" />

            <div className="space-y-8 relative">
              {selectedFlow.steps.map((step, index) => (
                <div key={step.id} className="flex gap-6 relative group">
                  {/* Step Number Circle */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm z-10 relative group-hover:border-primary/50 transition-colors">
                    {index + 1}
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1 bg-card/30 border border-border/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                      <span className="text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {step.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {step.description}
                    </p>
                    
                    {step.testCases && step.testCases.length > 0 && (
                      <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Covered by:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {step.testCases.map(tcId => (
                            <span key={tcId} className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                              {tcId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
