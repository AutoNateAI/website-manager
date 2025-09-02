-- Upsert default SOP templates without unique constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sop_templates WHERE title = 'Process Documentation Template') THEN
    INSERT INTO public.sop_templates (title, description, category, template_structure, sections, screenshot_placeholders)
    VALUES (
      'Process Documentation Template', 'Standard template for documenting business processes', 'process',
      '{"type": "process", "format": "structured"}',
      '[{"id":"overview","title":"Process Overview","required":true,"order":1},{"id":"prerequisites","title":"Prerequisites","required":true,"order":2},{"id":"steps","title":"Step-by-Step Instructions","required":true,"order":3},{"id":"troubleshooting","title":"Troubleshooting","required":false,"order":4},{"id":"resources","title":"Additional Resources","required":false,"order":5}]',
      '[{"section":"overview","description":"Process flow diagram"},{"section":"steps","description":"Screenshots for each major step"},{"section":"troubleshooting","description":"Error message screenshots"}]'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sop_templates WHERE title = 'Training Materials Template') THEN
    INSERT INTO public.sop_templates (title, description, category, template_structure, sections, screenshot_placeholders)
    VALUES (
      'Training Materials Template', 'Template for creating training documentation', 'training',
      '{"type": "training", "format": "educational"}',
      '[{"id":"objectives","title":"Learning Objectives","required":true,"order":1},{"id":"introduction","title":"Introduction","required":true,"order":2},{"id":"modules","title":"Training Modules","required":true,"order":3},{"id":"exercises","title":"Practical Exercises","required":false,"order":4},{"id":"assessment","title":"Assessment","required":false,"order":5},{"id":"resources","title":"Additional Resources","required":false,"order":6}]',
      '[{"section":"introduction","description":"Welcome screen or dashboard"},{"section":"modules","description":"Screenshots of key interface elements"},{"section":"exercises","description":"Example completion screenshots"}]'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sop_templates WHERE title = 'Policy Document Template') THEN
    INSERT INTO public.sop_templates (title, description, category, template_structure, sections, screenshot_placeholders)
    VALUES (
      'Policy Document Template', 'Template for organizational policies and procedures', 'policy',
      '{"type": "policy", "format": "formal"}',
      '[{"id":"purpose","title":"Purpose and Scope","required":true,"order":1},{"id":"definitions","title":"Definitions","required":false,"order":2},{"id":"policy","title":"Policy Statement","required":true,"order":3},{"id":"procedures","title":"Procedures","required":true,"order":4},{"id":"compliance","title":"Compliance and Monitoring","required":false,"order":5},{"id":"references","title":"References","required":false,"order":6}]',
      '[{"section":"procedures","description":"Workflow diagrams"},{"section":"compliance","description":"Monitoring dashboard screenshots"}]'
    );
  END IF;
END $$;