import re
import json

with open("apps/web/src/pages/docs.tsx.backup", "r") as f:
    content = f.read()

# We want to extract sections. 
# A section has an h2.
sections = re.findall(r'<section.*?<h2.*?>(.*?)</h2>(.*?)</section>', content, re.DOTALL)

test_cases = []
id_counter = 1

for category, section_content in sections:
    category = category.strip()
    
    # We also might have h3 for subcategories but let's just use category for now or combine.
    # Find all <Gherkin id="..." title="..." gherkin={`...`} />
    # Sometimes gherkin={...} has quotes or backticks.
    
    gherkins = re.findall(r'<Gherkin\s+id="([^"]+)"\s+title="([^"]+)"\s+gherkin=\{`([^`]+)`\}\s*/>', section_content, re.DOTALL)
    
    for gid, title, gherkin in gherkins:
        # Mock status and priority
        # Let's say priority is P1 for everything, and status is Automated.
        test_cases.append({
            "id": gid,
            "title": title,
            "category": category,
            "gherkin": gherkin.strip(),
            "status": "Automated",
            "priority": "P1" if "API" in title or "Successful" in title else "P2",
        })

print(f"Extracted {len(test_cases)} test cases.")

with open("test_cases.json", "w") as f:
    json.dump(test_cases, f, indent=2)
