import pandas as pd

# Read the complete NAICS structure
df = pd.read_excel('attached_assets/NAICS Lookup.xlsx', sheet_name='naics-scian-2022-structure-v1-e')

# Convert Code column to string and handle NaN values
df['Code'] = df['Code'].astype(str)
df = df.dropna(subset=['Code'])

# Clean up codes - remove .0 suffix
df['Code'] = df['Code'].str.replace('.0', '', regex=False)

# Filter for eligible sectors (11, 21, 22, 23, 31-33, 48, 56)
eligible_sectors = ['11', '21', '22', '23', '31', '32', '33', '48', '56']

# Filter and organize by level
sectors_df = df[df['Level'] == 2].copy()
subsectors_df = df[df['Level'] == 3].copy() 
industries_df = df[df['Level'] == 6].copy()

# Group sectors by their 2-digit code
sector_groups = {}
for _, row in sectors_df.iterrows():
    code = str(row['Code'])[:2]
    if code in eligible_sectors:
        if code not in sector_groups:
            sector_groups[code] = []
        sector_groups[code].append(str(row['Class title']))

# Create consolidated sectors
consolidated_sectors = []
for code in eligible_sectors:
    if code in sector_groups:
        # Take the most general title or combine them
        titles = sector_groups[code]
        if code == "11":
            title = "Agriculture, forestry, fishing and hunting"
        elif code == "21":
            title = "Mining, quarrying, and oil and gas extraction"
        elif code == "22":
            title = "Utilities"
        elif code == "23":
            title = "Construction"
        elif code in ["31", "32", "33"]:
            title = "Manufacturing"
        elif code == "48":
            title = "Transportation and warehousing"
        elif code == "56":
            title = "Administrative and support, waste management and remediation services"
        else:
            title = titles[0]
        consolidated_sectors.append((code, title))

# Generate TypeScript file content
with open('shared/naics-data.ts', 'w') as f:
    f.write("""// NAICS Code structure for eligible sectors
export interface NAICSCode {
  code: string;
  title: string;
  level: number;
  parent: string;
}

// Facility Sectors (2-digit codes)
export const FACILITY_SECTORS: NAICSCode[] = [
""")
    
    # Write consolidated sectors
    for code, title in consolidated_sectors:
        clean_title = title.replace('"', '\\"').replace("'", "\\'")
        f.write(f'  {{ code: "{code}", title: "{clean_title}", level: 2, parent: "" }},\n')
    
    f.write("];\n\n// Facility Categories (3-digit codes)\nexport const FACILITY_CATEGORIES: NAICSCode[] = [\n")
    
    # Write subsectors for eligible sectors
    for _, row in subsectors_df.iterrows():
        code = str(row['Code'])
        if len(code) >= 2 and code[:2] in eligible_sectors:
            title = str(row['Class title']).replace('"', '\\"').replace("'", "\\'")
            parent = code[:2]
            f.write(f'  {{ code: "{code}", title: "{title}", level: 3, parent: "{parent}" }},\n')
    
    f.write("];\n\n// Facility Types (6-digit codes)\nexport const FACILITY_TYPES: NAICSCode[] = [\n")
    
    # Write industries for eligible sectors
    count = 0
    for _, row in industries_df.iterrows():
        code = str(row['Code'])
        if len(code) >= 2 and code[:2] in eligible_sectors:
            title = str(row['Class title']).replace('"', '\\"').replace("'", "\\'")
            parent = code[:3]
            f.write(f'  {{ code: "{code}", title: "{title}", level: 6, parent: "{parent}" }},\n')
            count += 1
    
    print(f"Added {count} facility types")
    
    f.write("""];

// Helper functions for NAICS lookups
export function getFacilityCategoriesBySector(sectorCode: string): NAICSCode[] {
  return FACILITY_CATEGORIES.filter(category => category.parent === sectorCode);
}

export function getFacilityTypesByCategory(categoryCode: string): NAICSCode[] {
  return FACILITY_TYPES.filter(type => type.parent === categoryCode);
}

export function generateNAICSCode(sectorCode: string, categoryCode: string, typeCode: string): string {
  // Validate the combination
  const sector = FACILITY_SECTORS.find(s => s.code === sectorCode);
  const category = FACILITY_CATEGORIES.find(c => c.code === categoryCode && c.parent === sectorCode);
  const type = FACILITY_TYPES.find(t => t.code === typeCode && t.parent === categoryCode);
  
  if (!sector || !category || !type) {
    throw new Error('Invalid NAICS code combination');
  }
  
  return typeCode; // The 6-digit type code is the complete NAICS code
}

export function getNAICSDescription(naicsCode: string): string {
  const type = FACILITY_TYPES.find(t => t.code === naicsCode);
  if (type) {
    const category = FACILITY_CATEGORIES.find(c => c.code === type.parent);
    const sector = FACILITY_SECTORS.find(s => s.code === category?.parent);
    return `${sector?.title} > ${category?.title} > ${type.title}`;
  }
  return 'Unknown NAICS code';
}
""")

print("Generated complete NAICS data file with authentic data from Excel file")