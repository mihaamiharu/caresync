import json

with open("test_cases.json", "r") as f:
    test_cases = json.load(f)

ts_content = "export type TestCase = {\n  id: string;\n  title: string;\n  category: string;\n  gherkin: string;\n  status: 'Automated' | 'Manual' | 'Failing';\n  priority: 'P0' | 'P1' | 'P2';\n};\n\n"
ts_content += "export const TEST_CASES: TestCase[] = " + json.dumps(test_cases, indent=2) + ";\n"

with open("apps/web/src/pages/test-cases-data.ts", "w") as f:
    f.write(ts_content)
