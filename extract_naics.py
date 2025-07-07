import pandas as pd

# Read the 2022 NAICS Structure sheet with correct column mapping
df = pd.read_excel('attached_assets/NAICS Lookup.xlsx', sheet_name='2022 NAICS Structure', skiprows=1)
df.columns = ['Change_Indicator', 'NAICS_Code', 'NAICS_Title']

# Clean the data
df = df.dropna(subset=['NAICS_Code'])
df['NAICS_Code'] = df['NAICS_Code'].astype(str)
df['NAICS_Title'] = df['NAICS_Title'].astype(str)

# Filter for eligible sectors - Manufacturing is 31-33 combined
eligible_sectors = ['11', '21', '22', '23', '31', '32', '33', '48', '56']

# Get 2-digit sectors, but combine 31-33 into Manufacturing
sectors_raw = df[df['NAICS_Code'].str.len() == 2]
sectors_raw = sectors_raw[sectors_raw['NAICS_Code'].isin(eligible_sectors)]

# Create sectors list with Manufacturing combined
sectors_list = []
manufacturing_found = False

for _, row in sectors_raw.iterrows():
    code = str(row['NAICS_Code'])
    title = str(row['NAICS_Title'])
    
    if code in ['31', '32', '33']:
        if not manufacturing_found:
            # Use the first Manufacturing title we find
            sectors_list.append({'code': '31-33', 'title': 'Manufacturing', 'level': 2, 'parent': ''})
            manufacturing_found = True
    else:
        sectors_list.append({'code': code, 'title': title, 'level': 2, 'parent': ''})

sectors = pd.DataFrame(sectors_list)

# Get 3-digit categories  
categories = df[df['NAICS_Code'].str.len() == 3]
categories = categories[categories['NAICS_Code'].str[:2].isin(eligible_sectors)]

# Get 6-digit facility types
facility_types = df[df['NAICS_Code'].str.len() == 6]
facility_types = facility_types[facility_types['NAICS_Code'].str[:2].isin(eligible_sectors)]

print(f'Found {len(sectors)} sectors, {len(categories)} categories, {len(facility_types)} facility types')

# Generate the TypeScript file
with open('shared/naics-data.ts', 'w') as f:
    f.write("""// NAICS Code structure for eligible sectors from 2022 NAICS Structure
export interface NAICSCode {
  code: string;
  title: string;
  level: number;
  parent: string;
}

// Facility Sectors (2-digit codes)
export const FACILITY_SECTORS: NAICSCode[] = [
""")
    
    for sector in sectors_list:
        code = str(sector['code'])
        title = str(sector['title']).replace('"', '\\"').replace("'", "\\'")
        f.write(f'  {{ code: "{code}", title: "{title}", level: 2, parent: "" }},\n')
    
    f.write("""];

// Facility Categories (3-digit codes)
export const FACILITY_CATEGORIES: NAICSCode[] = [
""")
    
    for _, row in categories.iterrows():
        code = str(row['NAICS_Code'])
        title = str(row['NAICS_Title']).replace('"', '\\"').replace("'", "\\'")
        parent = code[:2]
        # Map Manufacturing sectors 31, 32, 33 to combined "31-33"
        if parent in ['31', '32', '33']:
            parent = '31-33'
        f.write(f'  {{ code: "{code}", title: "{title}", level: 3, parent: "{parent}" }},\n')
    
    f.write("""];

// Facility Types (6-digit codes)
export const FACILITY_TYPES: NAICSCode[] = [
""")
    
    for _, row in facility_types.iterrows():
        code = str(row['NAICS_Code'])
        title = str(row['NAICS_Title']).replace('"', '\\"').replace("'", "\\'")
        parent = code[:3]
        f.write(f'  {{ code: "{code}", title: "{title}", level: 6, parent: "{parent}" }},\n')
    
    f.write("""];

// Helper functions for NAICS lookups
export function getFacilityCategoriesBySector(sectorCode: string): NAICSCode[] {
  return FACILITY_CATEGORIES.filter(category => category.parent === sectorCode);
}

export function getFacilityTypesByCategory(categoryCode: string): NAICSCode[] {
  return FACILITY_TYPES.filter(type => type.parent === categoryCode);
}

export function generateNAICSCode(sectorCode: string, categoryCode: string, typeCode: string): string {
  const sector = FACILITY_SECTORS.find(s => s.code === sectorCode);
  const category = FACILITY_CATEGORIES.find(c => c.code === categoryCode && c.parent === sectorCode);
  const type = FACILITY_TYPES.find(t => t.code === typeCode && t.parent === categoryCode);
  
  if (!sector || !category || !type) {
    throw new Error('Invalid NAICS code combination');
  }
  
  return typeCode;
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

print('Generated complete NAICS data with all facility types')