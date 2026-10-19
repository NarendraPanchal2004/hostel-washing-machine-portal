-- ============================================================================
-- Hostel Washing Machine Booking System - Initial Seed Data (4 Machines)
-- ============================================================================

INSERT INTO public.machines (id, name, model, capacity_kg, status, location, photo_url, instructions)
VALUES
(
    1, 
    'Machine 1 (Bay 1)', 
    'LG Commercial AI Direct Drive 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 1)',
    'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. Best for cottons, bedsheets, and daily laundry. Quick Wash: 15m, Normal: 45m, Heavy/Allergy: 75m.'
),
(
    2, 
    'Machine 2 (Bay 2)', 
    'Samsung Inverter Eco Drum 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 2)',
    'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. High-speed wash with tangle-free drum. Suitable for sportswear and bulk wash.'
),
(
    3, 
    'Machine 3 (Bay 3)', 
    'Bosch Serie 6 VarioDrum 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 3)',
    'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. Ultra-quiet brushless motor with anti-vibration walls. Great for study hours and evening laundry.'
),
(
    4, 
    'Machine 4 (Bay 4)', 
    'IFB Senator Heavy Steam Pro 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 4)',
    'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. Steam allergy care. Recommended for winter jackets, curtains, blankets, and hoodies.'
)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    model = EXCLUDED.model,
    capacity_kg = EXCLUDED.capacity_kg,
    location = EXCLUDED.location,
    instructions = EXCLUDED.instructions;
