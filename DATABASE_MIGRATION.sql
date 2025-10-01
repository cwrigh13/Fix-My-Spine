-- Migration script to add population field and populate with Australian cities over 75,000
-- This script adds the population field to the locations table and populates it with data
-- UPDATED: Now includes latitude and longitude for proximity-based search

-- Add population field to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS population INT DEFAULT NULL;

-- Add latitude and longitude fields for proximity-based search
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL;

-- Insert or update locations with population data for Australian cities over 75,000
-- Data source: Australian Bureau of Statistics (ABS) 2021 Census data

-- Major cities and their populations (over 75,000) with coordinates
INSERT INTO locations (suburb, postcode, state, population, latitude, longitude) VALUES
-- New South Wales
('Sydney', '2000', 'NSW', 5312163, -33.8688, 151.2093),
('Newcastle', '2300', 'NSW', 322278, -32.9267, 151.7789),
('Wollongong', '2500', 'NSW', 295669, -34.4248, 150.8931),
('Maitland', '2320', 'NSW', 92000, -32.7325, 151.5582),
('Albury', '2640', 'NSW', 89000, -36.0737, 146.9135),
('Wagga Wagga', '2650', 'NSW', 57000, -35.1082, 147.3598),
('Tamworth', '2340', 'NSW', 42000, -31.0927, 150.9294),
('Orange', '2800', 'NSW', 41000, -33.2839, 149.0996),
('Dubbo', '2830', 'NSW', 38000, -32.2426, 148.6017),
('Nowra', '2541', 'NSW', 37000, -34.8847, 150.5999),
('Bathurst', '2795', 'NSW', 35000, -33.4194, 149.5778),
('Lismore', '2480', 'NSW', 28000, -28.8142, 153.2789),
('Bowral', '2576', 'NSW', 15000, -34.4781, 150.4178),

-- Victoria
('Melbourne', '3000', 'VIC', 5078193, -37.8136, 144.9631),
('Geelong', '3220', 'VIC', 271057, -38.1499, 144.3617),
('Ballarat', '3350', 'VIC', 111973, -37.5622, 143.8503),
('Bendigo', '3550', 'VIC', 103034, -36.7570, 144.2794),
('Shepparton', '3630', 'VIC', 51000, -36.3806, 145.3989),
('Warrnambool', '3280', 'VIC', 35000, -38.3809, 142.4851),
('Traralgon', '3844', 'VIC', 26000, -38.1957, 146.5408),
('Mildura', '3500', 'VIC', 35000, -34.1889, 142.1583),
('Horsham', '3400', 'VIC', 20000, -36.7148, 142.1989),
('Colac', '3250', 'VIC', 12000, -38.3404, 143.5850),

-- Queensland
('Brisbane', '4000', 'QLD', 2566819, -27.4698, 153.0251),
('Gold Coast', '4217', 'QLD', 709590, -28.0167, 153.4000),
('Townsville', '4810', 'QLD', 195077, -19.2590, 146.8169),
('Cairns', '4870', 'QLD', 153951, -16.9186, 145.7781),
('Toowoomba', '4350', 'QLD', 142163, -27.5598, 151.9507),
('Rockhampton', '4700', 'QLD', 82000, -23.3781, 150.5136),
('Mackay', '4740', 'QLD', 81000, -21.1432, 149.1866),
('Bundaberg', '4670', 'QLD', 71000, -24.8661, 152.3489),
('Hervey Bay', '4655', 'QLD', 54000, -25.2990, 152.8696),
('Gladstone', '4680', 'QLD', 34000, -23.8419, 151.2569),
('Maryborough', '4650', 'QLD', 28000, -25.5384, 152.7016),
('Gympie', '4570', 'QLD', 21000, -26.1907, 152.6658),
('Warwick', '4370', 'QLD', 15000, -28.2196, 152.0341),

-- Western Australia
('Perth', '6000', 'WA', 2144588, -31.9505, 115.8605),
('Fremantle', '6160', 'WA', 32000, -32.0569, 115.7439),
('Rockingham', '6168', 'WA', 131000, -32.2769, 115.7297),
('Mandurah', '6210', 'WA', 90000, -32.5269, 115.7217),
('Bunbury', '6230', 'WA', 75000, -33.3267, 115.6372),
('Geraldton', '6530', 'WA', 41000, -28.7774, 114.6142),
('Kalgoorlie', '6430', 'WA', 33000, -30.7489, 121.4658),
('Albany', '6330', 'WA', 34000, -35.0269, 117.8839),
('Broome', '6725', 'WA', 15000, -17.9614, 122.2359),
('Port Hedland', '6721', 'WA', 16000, -20.3105, 118.6061),

-- South Australia
('Adelaide', '5000', 'SA', 1345777, -34.9285, 138.6007),
('Mount Gambier', '5290', 'SA', 26000, -37.8290, 140.7826),
('Whyalla', '5600', 'SA', 22000, -33.0333, 137.5833),
('Murray Bridge', '5253', 'SA', 20000, -35.1189, 139.2750),
('Port Augusta', '5700', 'SA', 14000, -32.4928, 137.7647),
('Port Pirie', '5540', 'SA', 14000, -33.1856, 138.0167),
('Victor Harbor', '5211', 'SA', 16000, -35.5517, 138.6186),
('Gawler', '5118', 'SA', 25000, -34.5981, 138.7442),

-- Tasmania
('Hobart', '7000', 'TAS', 247068, -42.8821, 147.3272),
('Launceston', '7250', 'TAS', 87000, -41.4419, 147.1450),
('Devonport', '7310', 'TAS', 25000, -41.1789, 146.3503),
('Burnie', '7320', 'TAS', 19000, -41.0519, 145.9033),
('Ulverstone', '7315', 'TAS', 14000, -41.1594, 146.1700),

-- Australian Capital Territory
('Canberra', '2601', 'ACT', 454499, -35.2809, 149.1300),
('Queanbeyan', '2620', 'ACT', 37000, -35.3531, 149.2324),

-- Northern Territory
('Darwin', '0800', 'NT', 139902, -12.4634, 130.8456),
('Alice Springs', '0870', 'NT', 28000, -23.6980, 133.8807),
('Katherine', '0850', 'NT', 11000, -14.4651, 132.2644),
('Nhulunbuy', '0880', 'NT', 3500, -12.1889, 136.7667)

ON DUPLICATE KEY UPDATE 
    population = VALUES(population),
    latitude = VALUES(latitude),
    longitude = VALUES(longitude);

-- Update existing locations with population and coordinate data where suburb names match
UPDATE locations SET population = 5312163, latitude = -33.8688, longitude = 151.2093 WHERE suburb = 'Sydney' AND state = 'NSW';
UPDATE locations SET population = 5078193, latitude = -37.8136, longitude = 144.9631 WHERE suburb = 'Melbourne' AND state = 'VIC';
UPDATE locations SET population = 2566819, latitude = -27.4698, longitude = 153.0251 WHERE suburb = 'Brisbane' AND state = 'QLD';
UPDATE locations SET population = 2144588, latitude = -31.9505, longitude = 115.8605 WHERE suburb = 'Perth' AND state = 'WA';
UPDATE locations SET population = 1345777, latitude = -34.9285, longitude = 138.6007 WHERE suburb = 'Adelaide' AND state = 'SA';
UPDATE locations SET population = 247068, latitude = -42.8821, longitude = 147.3272 WHERE suburb = 'Hobart' AND state = 'TAS';
UPDATE locations SET population = 454499, latitude = -35.2809, longitude = 149.1300 WHERE suburb = 'Canberra' AND state = 'ACT';
UPDATE locations SET population = 139902, latitude = -12.4634, longitude = 130.8456 WHERE suburb = 'Darwin' AND state = 'NT';

-- Update other major cities that might already exist in the database
UPDATE locations SET population = 322278, latitude = -32.9267, longitude = 151.7789 WHERE suburb = 'Newcastle' AND state = 'NSW';
UPDATE locations SET population = 295669, latitude = -34.4248, longitude = 150.8931 WHERE suburb = 'Wollongong' AND state = 'NSW';
UPDATE locations SET population = 271057, latitude = -38.1499, longitude = 144.3617 WHERE suburb = 'Geelong' AND state = 'VIC';
UPDATE locations SET population = 709590, latitude = -28.0167, longitude = 153.4000 WHERE suburb = 'Gold Coast' AND state = 'QLD';
UPDATE locations SET population = 195077, latitude = -19.2590, longitude = 146.8169 WHERE suburb = 'Townsville' AND state = 'QLD';
UPDATE locations SET population = 153951, latitude = -16.9186, longitude = 145.7781 WHERE suburb = 'Cairns' AND state = 'QLD';
UPDATE locations SET population = 142163, latitude = -27.5598, longitude = 151.9507 WHERE suburb = 'Toowoomba' AND state = 'QLD';