#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_seed.py — generates the NEXT Code of Practice clause register.

Source: NEXT plc "Supplier Auditing Standards", issued June 2025.
Output: seed_data.json (Apps Script / Python channel) and data.js (browser channel)

Credit Partner   : Industry Compliance & Sustainability Platform (ICSP)
Technology Partner: guulba — technology for better performance
"""

import json, os

# ---------------------------------------------------------------- sections ---
SECTIONS = [
    ("S1",   "1",    "No Forced Labour or Modern Slavery"),
    ("S2",   "2",    "Freedom of Association"),
    ("S3.1", "3.1",  "Health & Safety — Working Conditions"),
    ("S3.2", "3.2",  "Health & Safety — Fire Safety & Evacuation"),
    ("S3.3", "3.3",  "Health & Safety — Medical Programmes"),
    ("S3.4", "3.4",  "Health & Safety — Chemical Safety"),
    ("S3.5", "3.5",  "Health & Safety — Equipment & Machinery"),
    ("S3.6", "3.6",  "Health & Safety — Electrical Safety"),
    ("S3.7", "3.7",  "Health & Safety — Manual Handling"),
    ("S3.8", "3.8",  "Health & Safety — Job Hazard Assessment & PPE"),
    ("S3.9", "3.9",  "Health & Safety — Residential Accommodation"),
    ("S3.10","3.10", "Health & Safety — Childcare Facilities"),
    ("S3.11","3.11", "Health & Safety — Environmental Protection"),
    ("S4",   "4",    "Child Labour & Young Workers"),
    ("S5",   "5",    "Wages and Benefits"),
    ("S6",   "6",    "Working Hours"),
    ("S7",   "7",    "No Discrimination is Practiced"),
    ("S8",   "8",    "Regular Employment is Provided"),
    ("S9",   "9",    "Respectful Treatment of Employees"),
    ("S10",  "10",   "Management Systems"),
]

# ORSVAI default routing per section (Owner, Responsible, Support, Verify, Approve, Inform)
ORSVAI = {
    "S1":   ("Head of Compliance","Compliance Officer","HR Manager","Internal Audit","Managing Director","Worker Participation Committee"),
    "S2":   ("Head of Compliance","Welfare Officer","Compliance Officer","Internal Audit","Managing Director","All Workers"),
    "S3.1": ("Head of Admin","Housekeeping In-charge","Admin Manager","Safety Committee","Director Operations","Worker Participation Committee"),
    "S3.2": ("Head of Safety","Safety Officer","Maintenance Manager","Safety Committee","Managing Director","All Workers"),
    "S3.3": ("Head of Safety","Factory Medical Officer","HR Manager","Safety Committee","Director Operations","All Workers"),
    "S3.4": ("Head of Safety","Chemical Store In-charge","Washing/Dyeing Manager","Internal Audit","Director Operations","Production Supervisors"),
    "S3.5": ("Head of Engineering","Maintenance Manager","Production Manager","Safety Committee","Director Operations","Machine Operators"),
    "S3.6": ("Head of Engineering","Chief Electrician","Maintenance Manager","Safety Committee","Director Operations","Maintenance Team"),
    "S3.7": ("Head of Safety","Safety Officer","Store In-charge","Safety Committee","Director Operations","Store & Finishing Teams"),
    "S3.8": ("Head of Safety","Safety Officer","Production Manager","Internal Audit","Director Operations","All Workers"),
    "S3.9": ("Head of Admin","Dormitory Warden","Safety Officer","Safety Committee","Director Operations","Resident Workers"),
    "S3.10":("Head of Admin","Childcare Supervisor","Factory Medical Officer","Safety Committee","Director Operations","Parent Workers"),
    "S3.11":("Head of Sustainability","ETP In-charge","Chemical Store In-charge","Internal Audit","Managing Director","Environment Cell"),
    "S4":   ("Head of Compliance","Recruitment Officer","HR Manager","Internal Audit","Managing Director","Line Supervisors"),
    "S5":   ("Head of HR","Payroll Manager","Accounts Manager","Internal Audit","Managing Director","All Workers"),
    "S6":   ("Head of HR","Time Office In-charge","Production Planning","Internal Audit","Managing Director","All Workers"),
    "S7":   ("Head of HR","HR Compliance Officer","Welfare Officer","Internal Audit","Managing Director","All Workers"),
    "S8":   ("Head of HR","HR Manager","Legal & Contracts","Internal Audit","Managing Director","Sub-contractors"),
    "S9":   ("Head of HR","Grievance Officer","Anti-Harassment Committee","Internal Audit","Managing Director","All Workers"),
    "S10":  ("Managing Director","Head of Compliance","Department Heads","Internal Audit","Board","All Departments"),
}

# ------------------------------------------------------------------ clauses ---
# (section_key, clause_title, requirement, evidence, worst_grade, workstream)
# worst_grade = highest severity NEXT applies if this control fails.
C = [
# ---- Section 1 : No Forced Labour ------------------------------------------
("S1","Modern slavery prohibition policy","Adopt and enforce a written policy prohibiting modern slavery, human trafficking, forced, bonded and involuntary prison labour.","Signed policy, Bangla + English, notice-board photos, worker briefing register","CAT 6","Policy"),
("S1","Freedom of movement on site","Workers can leave the production floor and any residential facility at any time when not working; no gate or exit restriction at end of shift.","Security SOP, gate register, no-lock declaration, worker interview notes","CAT 6","Practice"),
("S1","Access to medical care in working hours","Workers may consult a doctor during working hours without penalty or permission barrier.","Medical room log, leave/pass procedure, sample gate passes","CAT 6","Practice"),
("S1","No recruitment fee","No worker pays any fee or deposit to secure employment, directly or through any agent.","No-fee policy, recruitment SOP, signed agent undertakings, worker declarations","CAT 6","Practice"),
("S1","No deposit for tools, PPE, training or accommodation","No deposit or fee is retained for accommodation, tools, training or PPE — initial issue or replacement.","PPE issue register (free of charge), payroll deduction analysis","CAT 5","Practice"),
("S1","Free resignation and full final settlement","Workers may terminate employment and receive all money owed in full; no financial penalty for leaving.","Resignation SOP, final settlement register, sample settlement sheets","CAT 6","Records"),
("S1","No retention of original identity documents","Originals are not retained; where retention is required by law, workers have access on demand and have consented.","ID handling SOP, consent forms, on-demand access log","CAT 6","Records"),
("S1","Written loan agreements at affordable rates","Any employer loan has a written agreement with clear, realistic and affordable repayment terms.","Loan register, signed agreements, repayment-rate calculation","MAJOR","Records"),
("S1","Reasonable notice period","Notice requirements for resignation are in line with legislative requirements — not unreasonable.","Appointment letter clause vs Bangladesh Labour Act 2006 s.27 mapping","MAJOR","Policy"),
("S1","No coercion, threat or control","No mental or physical threat; no worker owned, controlled or treated as a commodity.","Grievance log, disciplinary records, worker interview summary","CAT 6","Practice"),
("S1","Voluntary status of any prison-linked labour","If any prison labour is engaged, voluntary status is verifiable.","Declaration of non-use, supplier mapping","CAT 6","Records"),
# ---- Section 2 : Freedom of Association ------------------------------------
("S2","Freedom of association policy","Written policy respecting lawful freedom of association and collective bargaining, communicated to the whole workforce.","Policy, induction module, notice-board photos","MINOR","Policy"),
("S2","Worker committee constituted where legally required","A worker committee / participation committee exists as required by law.","Committee constitution, DIFE / labour office acknowledgement","MAJOR","Practice"),
("S2","Democratic and regular elections","Representatives are democratically elected, elections held regularly per legislation.","Election notice, ballot records, result declaration, minutes","MAJOR","Records"),
("S2","No management interference in elections","Management does not interfere in nomination, election or decision-making of representatives.","Independent election observer note, worker interviews","MAJOR","Practice"),
("S2","Balanced representation","No unequal representation of management to workers; equal male / female representation in committees.","Committee roster with gender and grade split","MINOR","Records"),
("S2","Representatives identified to all workers","Identities of chosen representatives are clearly communicated to all employees.","Photo board, circular, Bangla notice","MINOR","Practice"),
("S2","Facilities and paid time for representatives","Representatives get meeting room access and appropriate time off without loss of pay or benefits.","Meeting room booking log, attendance vs payroll cross-check","MAJOR","Practice"),
("S2","Documented meetings and follow-up actions","Meetings between management and representatives are minuted with issues raised and actions agreed, and communicated to workers.","Signed minutes, action tracker, communication proof","MINOR","Records"),
("S2","Collective agreement available and legally compliant","Any collective bargaining agreement is documented, meets legislation and is available for the workforce to review.","CBA copy, legal review note, worker access point","MINOR","Records"),
("S2","No discrimination against union members","No dismissal or discrimination of union members or representatives; no anti-union clauses in contracts.","Contract template review, termination analysis by union status","CAT 6","Policy"),
("S2","Parallel means where association is restricted by law","Where law restricts freedom of association, a parallel worker group mechanism is in place.","Parallel mechanism SOP, group roster","MAJOR","Practice"),
# ---- Section 3.1 : Working Conditions ---------------------------------------
("S3.1","Structurally sound premises","Workplace is safe, clean and of sound structure; severe cracks investigated by a competent engineer.","Structural / DEA assessment report, remediation closure certificate","CAT 6","Engineering"),
("S3.1","Fall protection at height and openings","Workers protected from falling from platforms, upper floors, ledges, lift shafts and roofs; floor and roof openings covered or guarded.","Guarding installation photos, height-work risk assessment","CAT 6","Engineering"),
("S3.1","Free, tested drinking water at all times","Clean tested drinking water free of charge, readily accessible at any time — not restricted to break times.","Water test report, point-count per floor, no-restriction notice","CAT 5","Facility"),
("S3.1","Ventilation and illumination","Workplace and all access staircases well ventilated and illuminated for safe work.","Lux survey, ventilation layout, exhaust maintenance log","MAJOR","Facility"),
("S3.1","Protection from extreme temperatures","System in place to protect employees from extreme temperatures.","Temperature log, fan / cooling / insulation plan","MAJOR","Facility"),
("S3.1","Toilet ratio and gender separation","Adequate toilets proportionate to workforce; at least one male and one female room every two floors.","Toilet count vs headcount sheet, floor plan","MAJOR","Facility"),
("S3.1","Toilet condition and privacy","Toilets clean, odour-free, with flushing water, hand washing, soap, hand drying, lockable doors and opaque windows.","Cleaning checklist, consumable issue register, inspection photos","CAT 5","Facility"),
("S3.1","Unrestricted toilet access","No restriction on the use of toilets or access to drinking water — no token or pass system.","Written no-restriction instruction, supervisor briefing record","CAT 6","Practice"),
("S3.1","Sanitary and medical waste bins","Bins provided for disposal of sanitary and medical waste.","Bin placement map, disposal contract","MAJOR","Facility"),
("S3.1","Canteen and food hygiene","Food storage, preparation and service areas clean and hygienic; no extremely poor hygiene posing a health risk.","Hygiene audit, pest control contract, temperature records","CAT 5","Facility"),
("S3.1","Cook qualification and health certification","Cooks trained in food preparation hygiene and hold appropriate health and safety certification.","Training certificates, annual health check reports","MAJOR","Records"),
("S3.1","Sterilised re-used utensils","Re-used food utensils are cleaned and sterilised.","Sterilisation SOP, daily log","MAJOR","Practice"),
("S3.1","Rest and eating facilities away from workstation","Facilities away from the workstation are provided for eating meals and rest during breaks.","Rest area layout, seating count, photos","MAJOR","Facility"),
# ---- Section 3.2 : Fire Safety ---------------------------------------------
("S3.2","Smoking policy and enforcement","Written smoking policy communicated to all; enforced site-wide with designated smoking area.","Policy, disciplinary records for breaches, designated area photo","CAT 5","Policy"),
("S3.2","No-smoking signage in critical areas","Signs posted wherever smoking is prohibited, including chemical store, boiler and generator rooms.","Signage placement map, photos","CAT 5","Facility"),
("S3.2","Combustible material stored 5m from building","Combustible materials stored at least 5 metres away from the building.","Storage yard layout with measured distance, photos","MAJOR","Facility"),
("S3.2","Documented evacuation plan and procedure","Written evacuation procedure covering fire, chemical spill, natural disaster and electricity failure.","Emergency Preparedness Plan, approval signature","MAJOR","Policy"),
("S3.2","Evacuation plans posted prominently","Plans with procedure, layout and assembly points posted prominently in a language workers understand.","Bangla layout maps per floor, photos","MINOR","Facility"),
("S3.2","Evacuation drills every 6 months","Drills conducted at least every six months in workplace and dormitories, reported and documented.","Drill reports with timing, evacuation time, observations, photos","MAJOR","Records"),
("S3.2","Assembly point designated","A safe assembly point outside the building is designated and marked.","Assembly point marking photo, capacity calculation","MINOR","Facility"),
("S3.2","Two emergency exits per floor","At least two emergency exits on each floor leading to a place of safety.","Floor-wise exit schedule, approved plan reference","CAT 5","Engineering"),
("S3.2","Exits unlocked and outward opening","No internal lock on any production floor door; no door locked during working hours; exit doors open outwards.","Lock-removal certificate, daily exit check log","CAT 6","Engineering"),
("S3.2","Aisle and stair width, obstruction-free","Main walkways at least one metre wide, free from obstruction and tripping hazards to a place of safety.","Marked aisle photos with width, daily housekeeping check","MAJOR","Facility"),
("S3.2","Secure handrails on stairs","Stairs have adequate and secure handrails and are clear of obstruction.","Handrail installation photos, inspection log","MAJOR","Engineering"),
("S3.2","Fire exit signage visible from all points","Signage to the nearest fire escape visible from all parts of the premises.","Signage coverage survey, photoluminescent sign spec","MAJOR","Facility"),
("S3.2","Fire alarm system on all floors","Fire alarm or equivalent warning on all floors, audible in all areas.","Alarm audibility test report per floor","CAT 6","Engineering"),
("S3.2","Alarm back-up power supply","All electrically installed fire alarms have a back-up power supply.","Battery / UPS spec, load test record","MAJOR","Engineering"),
("S3.2","Integrated smoke and heat detection","Integrated smoke / fire detection system installed where required by law.","Detector layout, commissioning certificate","MAJOR","Engineering"),
("S3.2","Emergency lighting on escape routes","Emergency lighting provided in the direction of escape routes for power failure.","Lighting layout, monthly function test log","CAT 6","Engineering"),
("S3.2","Adequate fire fighting equipment","Adequate extinguishers, hydrants, hose reels and sprinklers relative to the size and nature of operations.","Equipment schedule vs risk assessment, siting map","CAT 6","Facility"),
("S3.2","Equipment accessible and unobstructed","Fire protection equipment immediately accessible and free from obstruction.","Marked floor zones, daily obstruction check","MAJOR","Practice"),
("S3.2","Monthly visual inspection of fire equipment","Extinguishers, hydrants, hose reels, sprinklers, detectors, emergency lights and alarms inspected monthly for damage and obstruction.","Monthly inspection tags and register","MINOR","Records"),
("S3.2","Annual maintenance by qualified personnel","All fire equipment inspected and maintained annually by qualified personnel.","Third-party service reports, technician credentials","MAJOR","Records"),
("S3.2","Fire safety induction training","Induction training on fire safety provided to all employees; workers know that getting out safely is the priority.","Training module, attendance sheets, awareness spot-check","MINOR","Training"),
("S3.2","Current fire certificate on site","Valid fire certificate retained on site covering all floors including rooftop where required.","Fire licence copy with floor coverage check","CAT 6","Licence"),
("S3.2","Approved floor levels and building plans","Approved floor levels and building plans retained on site.","RAJUK / approving authority stamped plans","CAT 6","Licence"),
("S3.2","No flammable storage in stairwells or doorways","Flammable and combustible solids or liquids not stored in stairwells, under stairs or in doorways.","Housekeeping audit, storage relocation record","CAT 5","Practice"),
# ---- Section 3.3 : Medical Programmes ---------------------------------------
("S3.3","First aid coverage ratio","At least one qualified first aider per floor per shift; 1 per 50 employees under 100 headcount, 1 per 100 above.","First aider roster vs headcount, valid certificates","MAJOR","Practice"),
("S3.3","First aid boxes adequate and free","Sufficient first aid boxes, adequately stocked, replenished, in date and free of charge.","Box register, stock check log, expiry tracker","CAT 5","Records"),
("S3.3","First aid signage and identified first aiders","First aid signs posted with boxes; workers know who the trained first aiders are.","Signage photos, first aider photo board, awareness check","MINOR","Facility"),
("S3.3","Accident reporting channel","Accident reporting channels established and communicated to all employees.","Reporting SOP, communication proof, sample reports","MAJOR","Policy"),
("S3.3","Accident logging, investigation and prevention","Accidents reported, logged, investigated and analysed with preventive action to stop recurrence.","Accident register, root cause analysis, preventive action tracker","MAJOR","Records"),
("S3.3","Pre-employment medical for under-18s","Young persons under 18 do not commence employment until a thorough medical examination shows fitness for work.","Pre-employment medical reports for all young workers","MAJOR","Records"),
("S3.3","Annual medical for under-18s","Young persons under 18 undergo repeat medical examinations annually.","Annual medical schedule and reports","MAJOR","Records"),
("S3.3","Annual medical for respirator users","Annual medical examinations for employees using respiratory protection as part of their job.","Respirator user list, medical reports","MAJOR","Records"),
("S3.3","Annual hearing examination for noise-exposed workers","Annual hearing examinations for employees exposed to excessive noise for 8 hours or equivalent.","Noise-exposed roster, audiometry reports","MAJOR","Records"),
("S3.3","Legally required periodic medicals","Periodic medical examinations for designated persons — cooks, chemical handlers, dusty-area operators — as required by law.","Designated person list, examination schedule and reports","MAJOR","Records"),
("S3.3","Adequate first aid facilities","Adequate and appropriate first aid facilities provided for injury or illness at work.","Medical room layout, equipment list, staffing","MAJOR","Facility"),
# ---- Section 3.4 : Chemical Safety ------------------------------------------
("S3.4","Chemical inventory maintained","Inventory of all chemicals on site listing identification, compatibility, volume, flammability, toxicity, groundwater hazard and storage location.","Live chemical inventory, compatibility chart","MINOR","Records"),
("S3.4","Full chemical risk assessment","All chemicals used on site are fully risk assessed.","Risk assessment file per chemical, review dates","MAJOR","Records"),
("S3.4","Labelling in legible durable form","All chemicals and hazardous substances identified and labelled with warning signs per properties and law, legible, durable, understandable to workers.","Labelling audit, GHS label samples in Bangla","CAT 5","Practice"),
("S3.4","MSDS available at point of use","MSDS held for all chemicals, available at point of use in a language workers understand.","MSDS file per store and use point, Bangla translations","MAJOR","Records"),
("S3.4","Segregated and defined storage","Storage areas clearly defined and segregated — wet/dry, hazardous/non-hazardous, incompatible chemicals.","Store layout with segregation zones, photos","MAJOR","Facility"),
("S3.4","Compliant delivery, handling, transport and disposal","Chemicals and wastes delivered, handled, stored, transported and disposed of per properties and legislation.","Handling SOP, waste manifest, licensed vendor agreement","CAT 5","Practice"),
("S3.4","Chemical handler training","Employees trained on health risks of hazardous substances and the precautions necessary for protection, including correct PPE use.","Training matrix, attendance, competency check","MAJOR","Training"),
("S3.4","Correct PPE for chemical handling","Correct PPE provided for all employees handling chemicals, including respiratory and skin protection for spraying.","PPE matrix by task, issue register, wear-rate check","CAT 5","Practice"),
("S3.4","Spill response plan and spill kits","Emergency plan for chemical spills and releases; spill kits or absorbents in chemical storage and relevant production areas.","Spill plan, kit location map, drill record","MAJOR","Practice"),
("S3.4","Ventilation and exposure monitoring","Processes using hazardous chemicals well ventilated with personal exposure monitored and kept below regulatory limits.","Ventilation design, personal exposure monitoring reports","CAT 5","Engineering"),
("S3.4","Eye wash and dousing facilities","Eye washing equipment provided anywhere there is a risk of splashes to the eye, and next to battery charging stations.","Eye wash location map, weekly flush test log","MAJOR","Facility"),
("S3.4","Container condition and separate utensils","Chemical containers in sound condition with lids kept on when not in use; separate utensil per chemical to avoid cross contamination.","Store inspection checklist, utensil labelling photos","MINOR","Practice"),
("S3.4","No sandblasting or shot blasting","Sandblasting and shot blasting are not carried out at the facility.","Signed declaration, process map, wash plant audit","CAT 6","Practice"),
("S3.4","No hazardous storage in canteens or accommodation","Hazardous materials are not stored in accommodation premises or canteens.","Store location map, inspection record","CAT 6","Practice"),
# ---- Section 3.5 : Equipment & Machinery -----------------------------------
("S3.5","Machine guarding on all moving parts","All moving parts likely to cause injury effectively guarded, including light machinery such as sewing and linking machines.","Guarding audit per machine type, installation photos","MAJOR","Engineering"),
("S3.5","Guarding maintenance programme","Maintenance programme in place for all safety devices and guarding.","PM schedule, guard inspection log","MAJOR","Records"),
("S3.5","Emergency stop buttons effective and labelled","Emergency stop buttons are effective and clearly labelled.","Function test record, labelling photos","CAT 4","Engineering"),
("S3.5","Spinning machine automatic stopper","Automatic stopper sensor fitted on spinning machines in washing facilities.","Sensor commissioning record, test log","CAT 6","Engineering"),
("S3.5","Lift door interlocks functional","Goods and passenger lifts maintained with safety mechanisms preventing door opening when the platform is not at floor level.","Lift maintenance contract, interlock test certificate","CAT 6","Engineering"),
("S3.5","Goods lift used within permits","Goods lifts not used in breach of safety regulations and permits.","Lift permit, usage instruction notice","MAJOR","Licence"),
("S3.5","Statutory inspection of boilers, hoists, pressure vessels, forklifts","Hoists, pressure vessels, boilers and forklifts regularly inspected, properly maintained and documented.","Boiler certificate, third-party inspection reports","MAJOR","Licence"),
("S3.5","Trained and authorised operators only","Equipment used only by personnel trained and authorised for it; forklifts operated by authorised personnel only.","Operator authorisation list, licences, training records","MAJOR","Training"),
("S3.5","Daily forklift check and key control","Forklifts inspected daily when used with findings recorded; keys not left unattended in the ignition.","Daily check sheets, key custody log","MINOR","Records"),
("S3.5","Service line inspection","Machine drains, steam pipes, compressed air pipes, hot water pipes and tanks regularly inspected and maintained.","Inspection schedule and records, insulation check","MAJOR","Records"),
("S3.5","Permit-to-work system","Permit-to-work implemented for hot work, electrical work, steam and pressurised pipe work, tank entry, fire equipment impairment, grinding and welding.","Permit forms, issued permit file, authoriser list","MAJOR","Practice"),
("S3.5","Gas and welding cylinder control","Gas cylinders securely fixed, separated from incompatibles, at least 5m from production; welding cylinders fitted with flame arrestors and check valves.","Cylinder store photos, fitting inspection record","MAJOR","Facility"),
("S3.5","Welding PPE","Suitable eye and face protection supplied to all welding operatives.","PPE issue record, spot-check photos","MAJOR","Practice"),
("S3.5","Local exhaust ventilation maintenance","LEV systems on cutting, printing, ironing and pressing machines regularly cleaned and maintained.","LEV cleaning schedule, airflow test record","MAJOR","Records"),
("S3.5","Safe equipment in flammable storage areas","Only safe-rated equipment — lights, switches — used where flammable materials are stored.","Flameproof fitting certificate, area classification","MAJOR","Engineering"),
("S3.5","Portable heating appliances positioned safely","Portable heating appliances positioned safely away from combustibles.","Placement inspection record","MAJOR","Practice"),
# ---- Section 3.6 : Electrical Safety ----------------------------------------
("S3.6","Qualified electricians only","Only trained staff work with electricity; in-house electrician qualifications verifiable.","Electrician licence copies, competency verification","MAJOR","Licence"),
("S3.6","Portable appliance testing","All portable electrical equipment tested and checked by a qualified person within 24 months.","PAT register, test tags, tester credentials","MINOR","Records"),
("S3.6","Fixed wiring testing with records","Fixed wiring tested with records confirming results.","Fixed wiring test report, earth and insulation values","MAJOR","Records"),
("S3.6","Periodic electrical installation checks","Periodic documented checks for earthing adequacy, insulation resistance, circuit continuity and protective device function.","Test records with dates, retained and available","MAJOR","Records"),
("S3.6","Grounding and secure socket connection","All portable electrical equipment grounded and power connection securely fixed with a socket.","Inspection checklist, corrective photos","CAT 5","Engineering"),
("S3.6","Mains supply protection","Electricity mains supply free from obstacles, signed with warnings, properly maintained and guarded from unauthorised access.","Substation and panel room inspection, access control record","MAJOR","Facility"),
("S3.6","Non-flammable panel boards","Electrical panel boards and bus bars made from non-flammable material.","Panel specification, replacement record","MAJOR","Engineering"),
("S3.6","No exposed live wires or bus bars","No bare wires or bus bars exposed or accessible to unqualified persons.","Thermal scan report, enclosure photos","CAT 6","Engineering"),
("S3.6","Waterproof appliances outdoors and in wet areas","Only waterproof appliances and supply used outdoors and in wet areas such as washing and dyeing.","IP-rating schedule, area survey","MAJOR","Engineering"),
# ---- Section 3.7 : Manual Handling ------------------------------------------
("S3.7","Load limits matched to individual capability","No employee required to lift, carry, push or pull a load that could harm them, considering personal ability, load, task and environment.","Manual handling risk assessment, task-weight matrix","MAJOR","Records"),
("S3.7","Mechanical handling aids provided","Manual handling avoided where possible by providing mechanical handling equipment.","Trolley / hoist inventory, deployment plan","MAJOR","Facility"),
("S3.7","Manual handling training","Manual handling training provided and documented for employees.","Training module, attendance sheets","MINOR","Training"),
("S3.7","Job rotation against repetitive strain","Job rotation used where repetitive strain injuries could be a risk.","Rotation schedule, ergonomic assessment","MINOR","Practice"),
# ---- Section 3.8 : Job Hazard Assessment & PPE ------------------------------
("S3.8","Job hazard assessment completed","Job hazards assessed, identified and communicated to employees.","Risk assessment register by process, communication record","MAJOR","Records"),
("S3.8","Free suitable PPE","Suitable PPE supplied free of charge where risks are not controlled by other means; kept clean, well maintained and used appropriately.","PPE matrix, issue register, condition check","CAT 5","Practice"),
("S3.8","Chain gloves for electrical cutters","Chain gloves provided when using electrical cutters in the cutting process.","Cutting section PPE issue record, spot-check photos","MAJOR","Practice"),
("S3.8","PPE training","Employees trained to use and maintain PPE.","Training records, competency observation","MINOR","Training"),
("S3.8","PPE mandatory signage","Signs posted where PPE is required and its use is mandatory.","Signage map, photos","MINOR","Facility"),
("S3.8","Hazard warning signage","Warning signs posted for hazardous areas — high voltage, confined space, extreme temperatures, asbestos.","Signage inventory by area, photos","MAJOR","Facility"),
("S3.8","Noise assessment by qualified person","Qualified person conducts noise assessment where levels are likely to exceed recommended limits; reassessed when noise sources change.","Noise survey report, reassessment trigger log","MAJOR","Records"),
("S3.8","Noise control zone defined and signed","Noise control zone defined and signed where exposure exceeds recommended levels for 8 hours; hearing protection mandatory within it.","Zone marking photos, hearing protection issue record","MINOR","Facility"),
("S3.8","Air quality assessment","Periodic air quality assessments by a qualified person in line with site risk factors such as dust and specific chemicals.","Air quality report, sampling plan","MAJOR","Records"),
("S3.8","Illuminance assessment","Illuminance levels assessed periodically by a qualified person and after major layout changes.","Lux survey report, layout-change trigger record","MAJOR","Records"),
("S3.8","Noise elimination hierarchy applied","Noise sources eliminated where possible before relying on ear protection.","Engineering control plan, before/after readings","MAJOR","Engineering"),
# ---- Section 3.9 : Residential Accommodation --------------------------------
("S3.9","Accommodation separated from production","Residential accommodation safe and separate from the production area, particularly for fire precaution.","Site plan showing separation, fire compartmentation record","CAT 5","Engineering"),
("S3.9","Adequate living space, no overcrowding","Dormitories not crowded; living space adequate; personal living space separated by gender.","Occupancy vs floor area calculation, room register","MAJOR","Facility"),
("S3.9","Individual bed and lockers","Each employee has his or her own bed; lockers provided for personal belongings.","Bed and locker inventory vs resident list","MAJOR","Facility"),
("S3.9","Privacy in sleeping arrangements","Sleeping arrangements adequate with reasonable privacy.","Layout photos, partition / curtain record","MINOR","Facility"),
("S3.9","Dormitory fire protection","Fire fighting equipment, fire alarms, emergency lighting and clear emergency exit signposting in the residential building.","Equipment schedule, audibility test, signage photos","CAT 6","Engineering"),
("S3.9","Two exits where room exceeds 12 people","Rooms holding more than 12 people have two fire exits leading to separate places of safety.","Room-wise occupancy and exit schedule","CAT 5","Engineering"),
("S3.9","Dormitory evacuation plan and drills","Evacuation plan posted and drills conducted at least every six months in the dormitory.","Posted plan photos, drill reports","MAJOR","Records"),
("S3.9","Free movement in and out of dormitory","Employees may leave and enter the dormitory freely unless reasonable security and safety grounds are demonstrated.","Access control SOP, resident interviews","CAT 6","Practice"),
("S3.9","Shower ratio and privacy","Minimum one shower per 12 people, hot and cold water inside cubicles, doors or curtains for privacy.","Fixture count vs residents, inspection photos","MAJOR","Facility"),
("S3.9","Dormitory toilet ratio and condition","Minimum one toilet per 12 people, clean, odour-free, with flushing and hand washing water, one male and one female room per two floors, doors and opaque windows.","Fixture count, cleaning log, inspection photos","MAJOR","Facility"),
("S3.9","No open-flame cooking in living quarters","Cooking on open flames permitted only in kitchen facilities, never in living quarters.","Inspection record, appliance confiscation log, resident briefing","CAT 6","Practice"),
("S3.9","Residential condition monitoring","Conditions of accommodation, canteens and sanitary facilities monitored and recorded for factors affecting worker health.","Monthly monitoring checklist and trend record","MAJOR","Records"),
("S3.9","Structural soundness and maintenance","Residential building structurally sound and properly maintained.","Structural assessment, maintenance log","CAT 5","Engineering"),
("S3.9","Electrical safety in accommodation","Residential facilities safe in security, fire protection and electrical safety; no unsafe appliances that could risk life.","Electrical inspection report, appliance audit","CAT 6","Engineering"),
("S3.9","Dormitory fire certificate and approved plans","Current fire certificate retained on site; floor levels and building plans approved.","Fire licence, approved plan copies","CAT 6","Licence"),
("S3.9","Dormitory canteen hygiene and cook health checks","Food areas clean and hygienic, utensils sterilised, cooks trained and health checked annually.","Hygiene audit, annual health check reports","CAT 5","Records"),
# ---- Section 3.10 : Childcare -----------------------------------------------
("S3.10","Childcare on ground floor, clean and safe","Childcare facility clean, safe and located on the ground floor.","Facility layout, inspection photos","MAJOR","Facility"),
("S3.10","Carer ratio 1 to 8","Facility supervised at all times by no fewer than one carer for every eight children.","Attendance register vs carer roster","MAJOR","Practice"),
("S3.10","Fire safety and first aid in childcare","Adequate fire safety and first aid equipment in the childcare facility, with a secondary exit.","Equipment list, exit photos","CAT 5","Facility"),
("S3.10","Illness and injury records","Records kept of illnesses and injuries with reporting and investigation.","Childcare incident register","MAJOR","Records"),
("S3.10","Conformity to NEXT COP standards","All aspects of the childcare facility conform to NEXT Code of Practice standards.","Internal COP checklist for childcare, closure record","MAJOR","Records"),
# ---- Section 3.11 : Environmental Protection --------------------------------
("S3.11","Waste source identification and disposal procedure","Waste sources identified and a disposal procedure developed.","Waste inventory, disposal SOP","MAJOR","Policy"),
("S3.11","Hazardous waste labelling, storage and disposal","Hazardous waste labelled, stored in designated secure areas in sound containers, and disposed of properly.","Hazardous waste store photos, container condition log","MAJOR","Facility"),
("S3.11","Disposal records maintained","Disposal records maintained for all waste streams.","Waste manifest register, vendor receipts","MAJOR","Records"),
("S3.11","Qualified waste disposal vendors","Hazardous and chemical waste vendors qualified with formal processing agreements, permits and government approvals.","Vendor licence copies, signed agreements","MAJOR","Licence"),
("S3.11","Hazardous waste handler training","Training provided for employees handling hazardous waste.","Training records, attendance","MAJOR","Training"),
("S3.11","Air emission identification and monitoring","Air emission sources identified and emissions monitored per regulatory requirements.","Stack emission test reports, monitoring schedule","MAJOR","Records"),
("S3.11","Air treatment maintenance programme","Maintenance programmes and operating procedures developed and implemented for in-house air treatment facilities.","O&M manual, maintenance log","MAJOR","Records"),
("S3.11","Waste water discharge monitoring","Waste water discharge sources identified and monitored per regulatory requirements.","ETP inlet/outlet test reports, DoE parameters","MAJOR","Records"),
("S3.11","ETP maintenance and operating procedures","Maintenance programmes and operating procedures developed and implemented for in-house waste water treatment.","ETP O&M manual, operator log, sludge register","MAJOR","Records"),
("S3.11","Discharge licence held","Appropriate licence or permit for waste water discharge granted by the local authority.","DoE Environmental Clearance / discharge permit","MAJOR","Licence"),
("S3.11","No untreated discharge or land contamination","No direct discharge of untreated contaminated industrial wastewater into any inland water receiver; no large scale land contamination.","Discharge point survey, bypass-line removal certificate","CAT 5","Practice"),
("S3.11","Asbestos identified, monitored and labelled","Any asbestos identified, condition monitored, maintained safe and clearly labelled with worker awareness.","Asbestos survey, register, labelling photos","MAJOR","Records"),
("S3.11","Secondary containment 110%","Secondary containment of at least 110% of the largest container volume in chemical and fuel storage areas.","Bund volume calculation, photos","MINOR","Engineering"),
("S3.11","No drains in storage areas, drums covered","No drains inside storage areas; drum storage covered to prevent rainwater contact.","Store layout, roofing photos","MAJOR","Facility"),
("S3.11","Environmental and sludge licences on site","Environmental certificate and sludge disposal licence retained on site where required by law.","Certificate copies with validity dates","MAJOR","Licence"),
# ---- Section 4 : Child Labour ------------------------------------------------
("S4","Child labour policy in place","Factory has a written Child Labour Policy; no worker below 15 or the higher legal minimum age.","Policy, age profile analysis of full workforce","CAT 6","Policy"),
("S4","Age verification system","System to verify ages of new employees including checking original identity documents cross-referenced with the photograph.","Recruitment SOP, verification checklist, sample files","MAJOR","Practice"),
("S4","Borrowed document prevention","System to prevent borrowed identity documents, including periodic spot-checks of existing employees' documents.","Spot-check schedule and findings log","MAJOR","Practice"),
("S4","Age records retained on site","Copies of age records retained in the workplace for every employee.","Personnel file audit, completeness rate","MAJOR","Records"),
("S4","Young worker legal compliance","Young workers aged 15–18 comply with all local legal requirements — hours, contracts, permissions.","Young worker register, legal mapping sheet","MAJOR","Records"),
("S4","Young worker risk assessment","Risk assessments carried out covering workstation layout, exposure to biological, chemical and physical substances, equipment handling and work organisation.","Young worker risk assessment file","MAJOR","Records"),
("S4","Young workers in non-hazardous work only","Young workers protected from hazardous areas — no pressing, heavy lifting, dangerous chemicals or operations.","Job placement list, restricted-task matrix","MAJOR","Practice"),
("S4","Young worker health examination","Young workers receive a health examination where required by law.","Medical reports for all young workers","MAJOR","Records"),
("S4","Young worker registration with labour bureau","Young workers registered with the local labour bureau where required by law.","Registration acknowledgement copies","MAJOR","Licence"),
("S4","Parental signature on young worker contracts","Young worker contracts signed by a parent or guardian as required by law.","Signed contracts with guardian details","MINOR","Records"),
("S4","20 minutes rest per 4 hours for young workers","Minimum 20 minutes rest time provided for each 4 hours of work for young workers.","Break schedule, time records for young workers","MAJOR","Practice"),
("S4","No night work for young workers","Young workers do not work after 22:00 hours.","Attendance analysis by age group","MAJOR","Records"),
("S4","Supervision ratio 1 adult to 10 young workers","Supervision of young workers complies with a ratio of one adult to ten young workers.","Supervisor allocation sheet","MINOR","Practice"),
("S4","Education where transport dependency exists","Where young workers cannot leave due to dependency on company transport, educational facilities are provided.","Transport dependency analysis, education provision record","MAJOR","Practice"),
("S4","No children present in the workplace","Children are not permitted in the workplace at any time, including as visitors in hazardous areas.","Gate policy, visitor register, security briefing","MAJOR","Practice"),
("S4","Child remediation programme readiness","A child remediation programme is documented and ready to activate if a case is found.","Remediation SOP aligned to NEXT Child Remediation Programme","CAT 6","Policy"),
# ---- Section 5 : Wages and Benefits -----------------------------------------
("S5","Wages meet or exceed legal or benchmark standard","Wages for a standard working week meet or exceed national legal standards or industry benchmark, whichever is higher.","Wage grid vs gazette minimum wage, benchmark comparison","CAT 5","Records"),
("S5","Monthly payment within legal date","Wages paid at least monthly and within the legal payment date.","Payment date log for 12 months, bank transfer proof","CAT 6","Records"),
("S5","Itemised understandable payslips","Written understandable payslip showing hours or piece rate, pay rate, gross pay, overtime pay, itemised deductions and net pay, in a language workers understand.","Payslip template, Bangla version, sample distribution proof","MAJOR","Records"),
("S5","Statutory contributions made","Contributions made for social security, pension and tax as applicable.","Contribution challans, remittance records","CAT 4","Records"),
("S5","No disciplinary wage deductions","No deductions made as a disciplinary measure or unauthorised for any reason unless allowed by law.","Deduction analysis, disciplinary records cross-check","CAT 6","Records"),
("S5","Payment for employer-required work stoppage","Where the employer requires work stoppage, employees are paid at not less than minimum wage unless legislation specifies otherwise.","Stoppage log, corresponding payroll entries","CAT 5","Records"),
("S5","Direct payment to the worker","Wages paid directly to the worker concerned, in legal tender.","Bank / MFS transfer records in worker's own account","CAT 5","Records"),
("S5","Legal benefits and bonuses paid on time","All legally required benefits and bonuses paid to workers on time and in full.","Festival bonus register, benefit payment schedule","MAJOR","Records"),
("S5","Consistent and reliable records","Accurate and reliable records with no inconsistencies between payroll, payslips, clock cards and other factory documents.","Three-way reconciliation of payroll, attendance and production","CAT 5","Records"),
("S5","No falsification of wage records","No deliberate falsification of wage records.","Internal audit report, whistleblowing channel record","CAT 5","Records"),
("S5","Severance paid in line with law","Severance paid to all workers in line with local law, including payment in lieu of notice where applicable.","Severance calculation sheets, settlement register","CAT 4","Records"),
("S5","Meal, housing and other legal benefits paid","Meal, housing and other benefits paid where required by law.","Benefit entitlement matrix vs payroll","MINOR","Records"),
# ---- Section 6 : Working Hours ----------------------------------------------
("S6","Documented and communicated work schedule","Work schedule documented and communicated, including start and end times and where duties are carried out.","Posted schedule, contract clause, notice-board photos","MINOR","Policy"),
("S6","Accurate time recording for all pay types","System records all employees' working time accurately, including piece rate, hourly and monthly paid.","Digital attendance system spec, sample raw data export","CAT 5","Records"),
("S6","Standard hours within 48 per week","Contracted working hours excluding overtime do not exceed 48 hours per week or local law, whichever gives greater protection.","Contract clause, weekly hours analysis","MAJOR","Records"),
("S6","Total hours within 60 per week","Total hours worked in any week do not exceed 60 hours.","Weekly total-hours distribution report, exception log","MAJOR","Records"),
("S6","Exceptional circumstances test documented","Any week above 60 hours meets all four tests — national law, freely negotiated collective agreement, health and safety safeguards, demonstrable exceptional circumstances.","Exception approval file with all four evidences","MAJOR","Records"),
("S6","Overtime is voluntary","Overtime is voluntary; no compulsory overtime and no penalty for refusal.","Consent records, refusal log, disciplinary cross-check","CAT 6","Practice"),
("S6","Overtime premium at 125% or legal rate","Overtime compensated at a premium — recommended not less than 125% of regular pay or the national legal rate, whichever is higher — paid at the wage frequency, or given as equivalent paid time off.","OT rate calculation sheet, sample payslips","MAJOR","Records"),
("S6","One rest day in seven","At least one day off in every seven day period, or two in fourteen where national law allows; rest day is a full 24 hours.","Roster analysis, seven-day working exception report","MAJOR","Records"),
("S6","Rest days posted","Rest days posted as notices in convenient places within the establishment.","Notice photos per floor","MINOR","Facility"),
("S6","Paid annual holiday leave","Every employee is entitled to paid annual holiday leave in line with local legislation, and is not unreasonably restricted from taking it.","Leave ledger, utilisation rate, refusal log","CAT 5","Records"),
("S6","Sick leave without penalty","Reasonable absence for genuine incapacity through illness without financial penalty or threat of dismissal, with reasonable payment to meet basic needs.","Sick leave policy, payment records, termination analysis","CAT 6","Policy"),
("S6","Statutory leave entitlement paid","Statutory and public holidays, annual leave, sick leave and maternity leave paid in full, systematically.","Leave payment register, maternity benefit records","CAT 4","Records"),
("S6","Rest breaks not shorter than legal requirement","Rest breaks meet or exceed the legal minimum and are not restricted.","Break schedule, floor observation record","CAT 5","Practice"),
("S6","Night worker safeguards","Safeguarding in place for night workers working not less than 7 hours including the interval between midnight and 05:00.","Night work risk assessment, safeguarding SOP","MINOR","Records"),
("S6","Free health assessment for night workers","Night workers may request a free health assessment and receive advice on health issues associated with their work.","Request procedure, assessment reports, no-charge proof","CAT 5","Records"),
("S6","Protected hours for pregnant, young and female workers","Pregnant, young and female workers do not work illegal hours, and any required prior approval from local labour bodies is obtained.","Restricted roster, approval letters","MAJOR","Records"),
# ---- Section 7 : Discrimination ----------------------------------------------
("S7","Anti-discrimination policy across the employment cycle","Policy covering recruitment, wages, benefits, promotion, training, transfer, termination, retirement and access to facilities.","Written policy with all cycle stages covered","MAJOR","Policy"),
("S7","Policy communicated to workers","Employment practices and the discrimination policy clearly communicated to workers.","Induction module, refresher briefings, notice-board proof","MINOR","Training"),
("S7","No pregnancy testing","No pregnancy testing of employees or potential recruits.","Recruitment medical protocol, signed declaration","CAT 6","Practice"),
("S7","No dismissal on discriminatory grounds","No dismissal of workers on proven discriminatory grounds including pregnancy or sickness.","Termination analysis by reason and category","CAT 6","Records"),
("S7","Equal terms for contract and direct workers","No discriminatory practices in wages, benefits and employment terms between contract and directly employed workers.","Comparative terms analysis","CAT 6","Records"),
("S7","Maternity return to equivalent position","Women returning from maternity leave are given an equivalent position and pay.","Maternity return register with grade and pay comparison","CAT 6","Records"),
("S7","Equal access to jobs, training, promotion and transfer","All employees have equal access to jobs, training, promotion and transfer with no less favourable wages, benefits or facility access.","Promotion and training data disaggregated by gender and grade","MAJOR","Records"),
("S7","Fair disciplinary procedure without discrimination","Fair disciplinary procedure adopted; no disciplinary action, dismissal, redundancy or lay-off selection on discriminatory grounds.","Disciplinary register, redundancy selection criteria","MAJOR","Policy"),
# ---- Section 8 : Regular Employment ------------------------------------------
("S8","Written contract or letter of employment","Written understandable labour contract or letter of employment including workplace name and location, employee name, initial wage and job title, signed and retained by both parties, consistent with legislation.","Contract template, signed copies, retention audit","MAJOR","Records"),
("S8","Terms documentation available to workers","Documentation detailing working hours, work days, rest days, notice period, leave entitlement and other benefits, communicated and available for reference at any time.","Service rules booklet, worker copy issue register","MAJOR","Records"),
("S8","Copies of contracts provided to workers","Copies of contracts or terms of employment provided to workers and held by the company.","Acknowledgement register, personnel file sample","MAJOR","Records"),
("S8","No post-signature contract changes","No changes made to employment terms after the contract is signed by the worker.","Version control record, amendment consent forms","MAJOR","Practice"),
("S8","Probation within legal limits","Probationary periods do not exceed legal limits.","Probation register, confirmation letters","MAJOR","Records"),
("S8","No prohibited employment practices","No 'at will' terminations, termination without notice, inappropriate self-employed status for lower grade workers, or false apprenticeships.","Termination file review, apprenticeship scheme review","MAJOR","Practice"),
("S8","No abuse of fixed term or zero hour contracts","Fixed term, home working, sub-contracting and labour-only contracting not used excessively to avoid labour or social security obligations.","Contract-type mix analysis, tenure distribution","MAJOR","Records"),
("S8","No dismiss-and-rehire cycling","Workers are not regularly dismissed and rehired to avoid legal obligations under labour and social security laws.","Rehire pattern analysis over 24 months","CAT 5","Records"),
("S8","Right to work verification documented","All employees have a valid work permit or proof of legal right to work, and the verification process is documented.","Verification checklist, permit copies for migrant workers","CAT 6","Records"),
("S8","Casual worker contracts","Casual workers issued a contract in a language they understand outlining hours, location, pay rate, termination terms and anticipated assignment length, without single-employer restriction.","Casual contract template, signed samples","MAJOR","Records"),
("S8","Labour provider licensing and audit","Labour providers hold a valid licence, are fully audited for working conditions and agency practices, and comply with the NEXT Agency Labour Policy.","Provider licence, compliance audit report, signed policy","MAJOR","Licence"),
("S8","No recruitment fees by labour providers","Labour providers do not charge workers fees to find work, or fees exceeding legal limits for passport services or health checks.","Fee declaration, worker interview evidence, refund record","CAT 6","Practice"),
("S8","Migrant contract consistency","Migrant workers receive detailed employment terms in the home country matching the terms in the country of work.","Home-country contract vs local contract comparison","CAT 6","Records"),
("S8","No blank paper signing","Workers are not required to sign blank papers, including for use as resignation letters.","Personnel file audit, worker declaration","CAT 6","Practice"),
("S8","Subcontractor compliance and declaration","All subcontractors comply with national law and NEXT COP, receive the COP requirements, are periodically audited, and are declared to NEXT.","Subcontractor register, declaration to NEXT, audit reports","MINOR","Records"),
("S8","Social security registration of all workers","All workers registered and contributions paid — no systematic non-registration to avoid social security or other benefits.","Registration list vs headcount reconciliation","CAT 4","Records"),
# ---- Section 9 : Respectful Treatment ----------------------------------------
("S9","No abuse or inhumane treatment","No corporal punishment, physical, mental or verbal abuse, sexual harassment, intimidation or harsh treatment.","Anti-harassment policy, incident log, worker interviews","CAT 6","Policy"),
("S9","No bribery by senior employees","Senior employees do not ask for or accept bribes from workers for preferential treatment or to avoid victimisation.","Anti-bribery policy, whistleblowing records, disciplinary actions","CAT 6","Policy"),
("S9","Protection from bullying and harassment","Employees protected from bullying, verbal or physical harassment, unreasonable body searches, victimisation, discrimination or abuse from management, colleagues or the public.","Security search SOP, same-gender search rule, incident register","CAT 6","Practice"),
("S9","Written grievance and disciplinary procedures","Written grievance and disciplinary procedures developed and communicated to management, supervisors and workers.","Procedure document, communication proof, awareness test","MAJOR","Policy"),
("S9","Fair procedure applied in all cases","A fair disciplinary and grievance procedure is adhered to in all cases of alleged misconduct or unsatisfactory performance.","Case files with process steps evidenced","MAJOR","Practice"),
("S9","All measures recorded","All disciplinary and grievance measures are recorded with documented actions.","Disciplinary and grievance registers with outcomes","MINOR","Records"),
("S9","Appeal channel available","An appeal channel is developed and implemented for employees facing disciplinary action.","Appeal SOP, appeal case records","MAJOR","Policy"),
("S9","Credible grievance redressal mechanism","A credible grievance redressal mechanism is in place per the NEXT Effective Grievance Mechanism Policy.","Multi-channel mechanism, resolution time KPI, worker awareness survey","MAJOR","Practice"),
("S9","Action against abusive supervisors","Disciplinary action implemented against supervisors, managers or workers who abuse or behave inappropriately.","Case outcomes, corrective action record","MAJOR","Practice"),
# ---- Section 10 : Management Systems -----------------------------------------
("S10","Demonstrable legal and COP compliance","Employer is fully aware of and able to demonstrate compliance with local legislation and NEXT COP requirements.","Legal register with applicability and compliance status","CAT 6","Records"),
("S10","Assigned compliance personnel","Personnel assigned responsibility for overall labour, environmental, chemical, health and safety performance.","Appointment letters, organogram, job descriptions","MAJOR","Policy"),
("S10","Line management accountability","Line management accountability defined for labour, environmental, health and safety issues.","ORSVAI accountability matrix by department","MAJOR","Policy"),
("S10","Disciplinary action for EHS rule violations","Disciplinary action taken for violation of labour, environmental, health and safety rules, with documentation maintained.","Violation register, action records","MAJOR","Records"),
("S10","Hazard identification process","Environmental, health and safety hazards identified in the workplace on an ongoing basis.","Hazard register, inspection schedule, closure tracking","MAJOR","Records"),
("S10","Training needs identification and plan","Training needs identified with plans for training across all compliance areas.","Training needs analysis, annual training calendar","MAJOR","Training"),
("S10","Continual improvement mechanism","Mechanism for continual improvement of labour, environmental, health and safety performance.","Management review minutes, KPI trend, improvement actions","MAJOR","Records"),
("S10","True and accurate records for all COP areas","True and accurate records maintained for all areas of compliance; no falsified records.","Document control procedure, record retention matrix","CAT 6","Records"),
("S10","Induction training content","Induction covers work schedule, wages and calculation, work and rest days, entitled leave, workplace rules, dormitory and canteen rules, disciplinary and grievance procedures.","Induction module, attendance sheets, content checklist","MINOR","Training"),
("S10","EHS awareness training content","EHS awareness training covers evacuation, fire prevention, accident reporting, electrical safety, asbestos, chemical handling and waste management.","Training module, attendance, comprehension check","MAJOR","Training"),
("S10","Job specific training","In-depth job specific training including self-audit training and accident investigation training.","Training records, competency assessment","MAJOR","Training"),
("S10","Training records completeness","Training records include date, content, trainer and attendees.","Training record template, completeness sample audit","MINOR","Records"),
("S10","Rules posted in local language","Workplace, canteen and dormitory rules posted in prominent areas in the local language.","Notice-board photos in Bangla per area","MINOR","Facility"),
("S10","Accurate production records","Accurate production records maintained and reliable for cross-verification with hours and wages.","Line-wise production records, cross-check with attendance","CAT 5","Records"),
("S10","Business and factory licences current","Business licence and factory licences current — including canteen licence, wastewater discharge licence and treatment plant operating licence.","Licence file with validity and renewal tracker","MAJOR","Licence"),
("S10","Full participation in the audit process","Reasonable participation in the audit process by factory management and workers; no concealment of workers and no refusal of audit.","Audit protocol briefing, previous audit cooperation record","CAT 6","Practice"),
("S10","RSC escalation status clear","No open RSC escalation at Stage 1, 2 or 3 (Bangladesh-specific).","RSC portal status printout, remediation progress report","CAT 6","Records"),
("S10","NEXT policy suite implemented","NEXT Shared Premises, Migrant Labour, Child Labour, Agency Labour, Chemical Management and Effective Grievance Mechanism policies adopted and implemented.","Signed policy adoption record, implementation evidence per policy","CAT 6","Policy"),
]

GRADE_WEIGHT = {"MINOR": 1, "MAJOR": 3, "CAT 4": 5, "CAT 5": 8, "CAT 6": 13}

# ---------------------------------------------------------------- phases -----
PHASES = [
    ("P0","Mobilisation & Governance",1,2,"Appoint the COP steering team, publish the ORSVAI matrix, open the register."),
    ("P1","Gap Assessment",2,4,"Walk all 20 clause groups against the June 2025 standard and grade every gap."),
    ("P2","Policy & Documentation",4,8,"Write or rewrite every policy, SOP and register the standard names."),
    ("P3","Physical & Engineering Remediation",5,14,"Fire, electrical, structural, machine guarding, chemical store, ETP and accommodation work."),
    ("P4","Systems & Records",6,12,"Payroll, time recording, age verification, licence tracker and document control."),
    ("P5","Training & Communication",8,14,"Induction, EHS, job specific, committee and grievance awareness across the workforce."),
    ("P6","Internal Verification & Mock Audit",14,17,"Full mock COP audit using NEXT grading, then close what it finds."),
    ("P7","CAP Closure & Audit Readiness",17,20,"Clear every Cat 4-6 finding, assemble the evidence pack, declare readiness."),
]

# Which workstream lands in which phase
WS_PHASE = {
    "Policy":"P2","Records":"P4","Practice":"P5","Facility":"P3",
    "Engineering":"P3","Training":"P5","Licence":"P4",
}


def make_id(idx):
    return "NX-%03d" % idx


def build():
    sec_lookup = {k: (n, t) for k, n, t in SECTIONS}
    items = []
    for i, (sec, title, req, ev, grade, ws) in enumerate(C, start=1):
        num, sec_title = sec_lookup[sec]
        o, r, s, v, a, inf = ORSVAI[sec]
        items.append({
            "id": make_id(i),
            "sectionKey": sec,
            "sectionNo": num,
            "sectionTitle": sec_title,
            "clause": title,
            "requirement": req,
            "evidence": ev,
            "grade": grade,
            "weight": GRADE_WEIGHT[grade],
            "workstream": ws,
            "phase": WS_PHASE[ws],
            "owner": o, "responsible": r, "support": s,
            "verify": v, "approve": a, "inform": inf,
            "status": "Not started",
            "progress": 0,
            "evidenceSighted": "No",
            "startDate": "", "dueDate": "", "completedDate": "",
            "revisedDueDate": "", "replacementOf": "", "replacedBy": "",
            "lastUpdated": "", "updateNote": "", "verifiedBy": "", "approvedBy": "",
            "cost": 0, "notes": "",
        })

    meta = {
        "standard": "NEXT plc Supplier Auditing Standards",
        "issued": "June 2025",
        "source": "https://www.nextplc.co.uk/~/media/Files/N/next-plc-v4/corporate-responsibility/_SUPPLIER%20Auditing%20Standards%20JUNE%202025.pdf",
        # No build date here on purpose: seed_data.json and data.js are committed,
        # and a date would make them drift every day and fail the CI drift check.
        "creditPartner": "Industry Compliance & Sustainability Platform (ICSP)",
        "technologyPartner": "guulba — technology for better performance",
        "grades": ["MINOR", "MAJOR", "CAT 4", "CAT 5", "CAT 6"],
        "gradeWeight": GRADE_WEIGHT,
        "orsvai": {
            "O": "Owner — carries the outcome",
            "R": "Responsible — does the work",
            "S": "Support — supplies people, budget or access",
            "V": "Verify — checks the evidence independently",
            "A": "Approve — signs it closed",
            "I": "Inform — must be told once it changes",
        },
    }
    sections = [{"key": k, "no": n, "title": t,
                 "count": sum(1 for x in items if x["sectionKey"] == k)} for k, n, t in SECTIONS]
    phases = [{"key": k, "title": t, "startWeek": a, "endWeek": b, "aim": aim}
              for k, t, a, b, aim in PHASES]

    return {"meta": meta, "sections": sections, "phases": phases,
            "items": items, "tasks": [], "caps": []}


ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_OUT = os.path.join(ROOT, "data", "seed_data.json")
JS_OUT   = os.path.join(ROOT, "docs", "assets", "data", "data.js")


def write(data, json_out=JSON_OUT, js_out=JS_OUT):
    """Write both channels: JSON for Apps Script and Python, JS for the browser."""
    os.makedirs(os.path.dirname(json_out), exist_ok=True)
    os.makedirs(os.path.dirname(js_out), exist_ok=True)
    with open(json_out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(js_out, "w", encoding="utf-8") as f:
        f.write("/* NEXT COP Readiness Board — seed clause register\n")
        f.write("   Generated by engine/build_seed.py from the NEXT plc Supplier\n")
        f.write("   Auditing Standards, June 2025. Do not edit by hand.\n")
        f.write("   Credit partner: Industry Compliance & Sustainability Platform\n")
        f.write("   Technology partner: guulba — technology for better performance */\n")
        f.write("const NEXT_SEED = ")
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write(";\n")
    return json_out, js_out


if __name__ == "__main__":
    from collections import Counter
    data = build()
    j, s = write(data)
    print("clauses :", len(data["items"]))
    print("sections:", len(data["sections"]))
    print("grades  :", dict(Counter(i["grade"] for i in data["items"])))
    print("written :", j)
    print("         ", s)
