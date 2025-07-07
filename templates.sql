-- Insert sample FRA form templates
INSERT INTO form_templates (activity_type, phase, name, description, form_fields, is_global, created_by) VALUES
('FRA', 'pre_activity', 'FRA Pre-Activity Assessment', 'Facility Readiness Assessment - Initial Evaluation', 
 '[{"id":"facility_overview","type":"textarea","label":"Facility Overview","required":true,"placeholder":"Describe your facility operations and main processes"},{"id":"energy_systems","type":"select","label":"Primary Energy Systems","required":true,"options":["Lighting","HVAC","Compressed Air","Motors","Boilers","Chillers"]},{"id":"annual_energy_cost","type":"number","label":"Annual Energy Cost ($)","required":true,"placeholder":"Enter annual energy costs"}]', 
 true, '43312061'),
('FRA', 'post_activity', 'FRA Post-Activity Report', 'Facility Readiness Assessment - Implementation Results',
 '[{"id":"improvements_implemented","type":"textarea","label":"Energy Improvements Implemented","required":true,"placeholder":"Describe what energy efficiency measures were implemented"},{"id":"energy_savings","type":"number","label":"Estimated Annual Energy Savings (%)","required":true,"placeholder":"Enter percentage of energy savings achieved"},{"id":"cost_savings","type":"number","label":"Estimated Annual Cost Savings ($)","required":true,"placeholder":"Enter dollar amount of annual cost savings"}]',
 true, '43312061');