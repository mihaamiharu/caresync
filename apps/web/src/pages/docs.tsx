import { useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { TEST_CASES, TestCase } from "./test-cases-data";
import { 
  Search, 
  Folder, 
  CheckCircle2, 
  PlayCircle, 
  X, 
  FileText,
  Activity,
  Shield,
  Clock
} from "lucide-react";

export function TestCasesPage() {
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
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden border-l border-border/40">
        {/* Header / Topbar */}
        <header className="h-16 border-b border-border/40 bg-card/30 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">Test Case Management</h1>
              <p className="text-xs text-muted-foreground mt-1">End-to-end testing scenarios</p>
            </div>
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
        </div>
      </main>
    </div>
  );
}
