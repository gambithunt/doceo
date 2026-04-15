-- Migration A: Create subject_topics catalog table
-- This table stores the canonical topic catalog for university and school learners

create table if not exists subject_topics (
  id uuid primary key default gen_random_uuid(),
  subject_key text not null,
  subject_display text not null,
  level text not null check (level in ('university', 'school')),
  year text not null,
  topic_label text not null,
  topic_signature text not null unique,
  textbook_ref text,
  blurb text,
  source text not null check (source in ('manual', 'ai_generated', 'admin_edited')) default 'manual',
  status text not null check (status in ('active', 'candidate', 'hidden')) default 'active',
  admin_weight numeric not null default 0,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for efficient querying by subject, level, year, and status
create index if not exists subject_topics_subject_key_level_year_status_idx
  on subject_topics (subject_key, level, year, status);

-- Index for topic_signature lookups
create index if not exists subject_topics_topic_signature_idx
  on subject_topics (topic_signature);

-- Enable RLS
alter table subject_topics enable row level security;

-- RLS policies: select = authenticated users; insert/update/delete = service role only
create policy "subject_topics_select_authenticated"
  on subject_topics for select
  to authenticated
  using (true);

create policy "subject_topics_insert_service_role"
  on subject_topics for insert
  to service_role
  with check (true);

create policy "subject_topics_update_service_role"
  on subject_topics for update
  to service_role
  using (true);

create policy "subject_topics_delete_service_role"
  on subject_topics for delete
  to service_role
  using (true);

-- Seed data: ~15-20 high-popularity university subjects × ~10 topics each
-- Using realistic textbook references

-- Computer Science
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('computer-science', 'Computer Science', 'university', 'year-1', 'Introduction to Programming with Python', encode(sha256('computer-science:university:year-1:introduction to programming with python'), 'hex'), 'Think Python: How to Think Like a Computer Scientist', 'Learn basic programming concepts, variables, loops, and functions using Python', 'manual', 'active', 10),
('computer-science', 'Computer Science', 'university', 'year-1', 'Data Structures: Arrays and Linked Lists', encode(sha256('computer-science:university:year-1:data structures: arrays and linked lists'), 'hex'), 'Introduction to Algorithms (CLRS)', 'Arrays, linked lists, stacks, and queues with practical implementations', 'manual', 'active', 9),
('computer-science', 'Computer Science', 'university', 'year-1', 'Discrete Mathematics for CS', encode(sha256('computer-science:university:year-1:discrete mathematics for cs'), 'hex'), 'Discrete Mathematics and Its Applications', 'Logic, sets, relations, functions, and combinatorics essential for CS', 'manual', 'active', 8),
('computer-science', 'Computer Science', 'university', 'year-1', 'Web Development Fundamentals', encode(sha256('computer-science:university:year-1:web development fundamentals'), 'hex'), 'HTML and CSS: Design and Build Websites', 'HTML, CSS, and basic JavaScript for building web pages', 'manual', 'active', 7),
('computer-science', 'Computer Science', 'university', 'year-1', 'Database Concepts and SQL', encode(sha256('computer-science:university:year-1:database concepts and sql'), 'hex'), 'Database System Concepts', 'Relational databases, SQL queries, and database design basics', 'manual', 'active', 8),
('computer-science', 'Computer Science', 'university', 'year-2', 'Algorithms and Complexity Analysis', encode(sha256('computer-science:university:year-2:algorithms and complexity analysis'), 'hex'), 'Introduction to Algorithms (CLRS)', 'Sorting, searching, graph algorithms, and Big-O notation', 'manual', 'active', 10),
('computer-science', 'Computer Science', 'university', 'year-2', 'Object-Oriented Programming', encode(sha256('computer-science:university:year-2:object-oriented programming'), 'hex'), 'Design Patterns: Elements of Reusable Object-Oriented Software', 'Classes, inheritance, polymorphism, and design patterns', 'manual', 'active', 8),
('computer-science', 'Computer Science', 'university', 'year-2', 'Operating Systems Concepts', encode(sha256('computer-science:university:year-2:operating systems concepts'), 'hex'), 'Operating System Concepts', 'Processes, threads, memory management, and file systems', 'manual', 'active', 7),
('computer-science', 'Computer Science', 'university', 'year-2', 'Computer Networks Fundamentals', encode(sha256('computer-science:university:year-2:computer networks fundamentals'), 'hex'), 'Computer Networking: A Top-Down Approach', 'TCP/IP, routing, HTTP, and network protocols', 'manual', 'active', 6),
('computer-science', 'Computer Science', 'university', 'year-2', 'Software Engineering Principles', encode(sha256('computer-science:university:year-2:software engineering principles'), 'hex'), 'Code Complete', 'Software development lifecycle, version control, testing, and agile', 'manual', 'active', 7);

-- Mathematics
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('mathematics', 'Mathematics', 'university', 'year-1', 'Calculus I: Limits and Derivatives', encode(sha256('mathematics:university:year-1:calculus i: limits and derivatives'), 'hex'), 'Thomas Calculus', 'Limits, continuity, derivatives, and basic integration', 'manual', 'active', 10),
('mathematics', 'Mathematics', 'university', 'year-1', 'Linear Algebra Fundamentals', encode(sha256('mathematics:university:year-1:linear algebra fundamentals'), 'hex'), 'Linear Algebra and Its Applications', 'Vectors, matrices, linear transformations, and eigenvalues', 'manual', 'active', 9),
('mathematics', 'Mathematics', 'university', 'year-1', 'Probability and Statistics Basics', encode(sha256('mathematics:university:year-1:probability and statistics basics'), 'hex'), 'Probability and Statistics', 'Descriptive statistics, probability theory, and distributions', 'manual', 'active', 8),
('mathematics', 'Mathematics', 'university', 'year-1', 'Mathematical Reasoning', encode(sha256('mathematics:university:year-1:mathematical reasoning'), 'hex'), 'How to Prove It', 'Proof techniques, logical reasoning, and mathematical writing', 'manual', 'active', 7),
('mathematics', 'Mathematics', 'university', 'year-2', 'Calculus II: Integration Techniques', encode(sha256('mathematics:university:year-2:calculus ii: integration techniques'), 'hex'), 'Thomas Calculus', 'Integration by parts, partial fractions, and infinite series', 'manual', 'active', 9),
('mathematics', 'Mathematics', 'university', 'year-2', 'Differential Equations', encode(sha256('mathematics:university:year-2:differential equations'), 'hex'), 'Differential Equations and Boundary Value Problems', 'ODEs, PDEs, and solution methods', 'manual', 'active', 8),
('mathematics', 'Mathematics', 'university', 'year-2', 'Abstract Algebra', encode(sha256('mathematics:university:year-2:abstract algebra'), 'hex'), 'Abstract Algebra', 'Groups, rings, fields, and homomorphisms', 'manual', 'active', 7),
('mathematics', 'Mathematics', 'university', 'year-2', 'Real Analysis', encode(sha256('mathematics:university:year-2:real analysis'), 'hex'), 'Principles of Mathematical Analysis', 'Real numbers, sequences, series, and continuity', 'manual', 'active', 7),
('mathematics', 'Mathematics', 'university', 'year-2', 'Numerical Methods', encode(sha256('mathematics:university:year-2:numerical methods'), 'hex'), 'Numerical Methods', 'Numerical approximation, error analysis, and computational techniques', 'manual', 'active', 6),
('mathematics', 'Mathematics', 'university', 'year-2', 'Discrete Mathematics Advanced', encode(sha256('mathematics:university:year-2:discrete mathematics advanced'), 'hex'), 'Concrete Mathematics', 'Advanced combinatorics, graph theory, and recurrence relations', 'manual', 'active', 6);

-- Physics
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('physics', 'Physics', 'university', 'year-1', 'Mechanics: Newton Laws', encode(sha256('physics:university:year-1:mechanics: newton laws'), 'hex'), 'University Physics', 'Newton laws, force analysis, and motion in one dimension', 'manual', 'active', 9),
('physics', 'Physics', 'university', 'year-1', 'Waves and Optics', encode(sha256('physics:university:year-1:waves and optics'), 'hex'), 'Fundamentals of Physics', 'Wave propagation, interference, diffraction, and optical instruments', 'manual', 'active', 8),
('physics', 'Physics', 'university', 'year-1', 'Thermodynamics Introduction', encode(sha256('physics:university:year-1:thermodynamics introduction'), 'hex'), 'Fundamentals of Thermodynamics', 'Heat, entropy, and the laws of thermodynamics', 'manual', 'active', 8),
('physics', 'Physics', 'university', 'year-1', 'Electricity and Magnetism', encode(sha256('physics:university:year-1:electricity and magnetism'), 'hex'), 'University Physics', 'Electric fields, magnetic fields, and electromagnetic waves', 'manual', 'active', 9),
('physics', 'Physics', 'university', 'year-2', 'Quantum Mechanics Foundations', encode(sha256('physics:university:year-2:quantum mechanics foundations'), 'hex'), 'Introduction to Quantum Mechanics', 'Wave functions, Schrödinger equation, and quantum states', 'manual', 'active', 8),
('physics', 'Physics', 'university', 'year-2', 'Modern Physics', encode(sha256('physics:university:year-2:modern physics'), 'hex'), 'Modern Physics', 'Relativity, quantum theory, and nuclear physics', 'manual', 'active', 7),
('physics', 'Physics', 'university', 'year-2', 'Electromagnetism Advanced', encode(sha256('physics:university:year-2:electromagnetism advanced'), 'hex'), 'Classical Electrodynamics', 'Maxwell equations, electromagnetic waves, and radiation', 'manual', 'active', 7),
('physics', 'Physics', 'university', 'year-2', 'Statistical Mechanics', encode(sha256('physics:university:year-2:statistical mechanics'), 'hex'), 'Statistical Physics', 'Microstates, Boltzmann distribution, and thermodynamic potentials', 'manual', 'active', 6),
('physics', 'Physics', 'university', 'year-2', 'Solid State Physics', encode(sha256('physics:university:year-2:solid state physics'), 'hex'), 'Introduction to Solid State Physics', 'Crystal structure, band theory, and semiconductor physics', 'manual', 'active', 6),
('physics', 'Physics', 'university', 'year-2', 'Computational Physics', encode(sha256('physics:university:year-2:computational physics'), 'hex'), 'Computational Physics', 'Numerical methods for solving physics problems', 'manual', 'active', 5);

-- Chemistry
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('chemistry', 'Chemistry', 'university', 'year-1', 'General Chemistry I', encode(sha256('chemistry:university:year-1:general chemistry i'), 'hex'), 'Chemistry: The Central Science', 'Atomic structure, periodic trends, and chemical bonding', 'manual', 'active', 9),
('chemistry', 'Chemistry', 'university', 'year-1', 'Organic Chemistry Basics', encode(sha256('chemistry:university:year-1:organic chemistry basics'), 'hex'), 'Organic Chemistry', 'Functional groups, reactions, and synthesis', 'manual', 'active', 8),
('chemistry', 'Chemistry', 'university', 'year-1', 'Chemical Thermodynamics', encode(sha256('chemistry:university:year-1:chemical thermodynamics'), 'hex'), 'Physical Chemistry', 'Enthalpy, entropy, and free energy', 'manual', 'active', 8),
('chemistry', 'Chemistry', 'university', 'year-2', 'Physical Chemistry', encode(sha256('chemistry:university:year-2:physical chemistry'), 'hex'), 'Physical Chemistry', 'Quantum chemistry, spectroscopy, and kinetics', 'manual', 'active', 7),
('chemistry', 'Chemistry', 'university', 'year-2', 'Biochemistry Introduction', encode(sha256('chemistry:university:year-2:biochemistry introduction'), 'hex'), 'Biochemistry', 'Proteins, enzymes, metabolism, and molecular biology', 'manual', 'active', 8),
('chemistry', 'Chemistry', 'university', 'year-2', 'Inorganic Chemistry', encode(sha256('chemistry:university:year-2:inorganic chemistry'), 'hex'), 'Inorganic Chemistry', 'Main group and transition metal chemistry', 'manual', 'active', 6),
('chemistry', 'Chemistry', 'university', 'year-2', 'Analytical Chemistry', encode(sha256('chemistry:university:year-2:analytical chemistry'), 'hex'), 'Analytical Chemistry', 'Chromatography, spectroscopy, and quantitative analysis', 'manual', 'active', 6),
('chemistry', 'Chemistry', 'university', 'year-2', 'Environmental Chemistry', encode(sha256('chemistry:university:year-2:environmental chemistry'), 'hex'), 'Environmental Chemistry', 'Pollution, green chemistry, and atmospheric chemistry', 'manual', 'active', 5);

-- Biology
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('biology', 'Biology', 'university', 'year-1', 'Cell Biology Fundamentals', encode(sha256('biology:university:year-1:cell biology fundamentals'), 'hex'), 'Molecular Biology of the Cell', 'Cell structure, organelles, and cellular processes', 'manual', 'active', 9),
('biology', 'Biology', 'university', 'year-1', 'Genetics Introduction', encode(sha256('biology:university:year-1:genetics introduction'), 'hex'), 'Genetics: A Conceptual Approach', 'DNA, RNA, heredity, and gene expression', 'manual', 'active', 9),
('biology', 'Biology', 'university', 'year-1', 'Ecology and Evolution', encode(sha256('biology:university:year-1:ecology and evolution'), 'hex'), 'Ecology', 'Ecosystems, biodiversity, and evolutionary theory', 'manual', 'active', 8),
('biology', 'Biology', 'university', 'year-2', 'Molecular Biology', encode(sha256('biology:university:year-2:molecular biology'), 'hex'), 'Molecular Biology of the Cell', 'DNA replication, transcription, and translation', 'manual', 'active', 8),
('biology', 'Biology', 'university', 'year-2', 'Microbiology', encode(sha256('biology:university:year-2:microbiology'), 'hex'), 'Brock Biology of Microorganisms', 'Bacteria, viruses, fungi, and their applications', 'manual', 'active', 7),
('biology', 'Biology', 'university', 'year-2', 'Human Physiology', encode(sha256('biology:university:year-2:human physiology'), 'hex'), 'Human Physiology', 'Organ systems, homeostasis, and physiological processes', 'manual', 'active', 8),
('biology', 'Biology', 'university', 'year-2', 'Developmental Biology', encode(sha256('biology:university:year-2:developmental biology'), 'hex'), 'Developmental Biology', 'Embryonic development, cell differentiation, and morphogenesis', 'manual', 'active', 6),
('biology', 'Biology', 'university', 'year-2', 'Neuroscience Basics', encode(sha256('biology:university:year-2:neuroscience basics'), 'hex'), 'Neuroscience', 'Neurons, synaptic transmission, and brain function', 'manual', 'active', 7);

-- Engineering
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('engineering', 'Engineering', 'university', 'year-1', 'Engineering Mathematics I', encode(sha256('engineering:university:year-1:engineering mathematics i'), 'hex'), 'Advanced Engineering Mathematics', 'Calculus, linear algebra, and differential equations for engineers', 'manual', 'active', 10),
('engineering', 'Engineering', 'university', 'year-1', 'Engineering Drawing and CAD', encode(sha256('engineering:university:year-1:engineering drawing and cad'), 'hex'), 'Engineering Graphics', 'Technical drawing, schematics, and computer-aided design', 'manual', 'active', 7),
('engineering', 'Engineering', 'university', 'year-1', 'Statics and Strength of Materials', encode(sha256('engineering:university:year-1:statics and strength of materials'), 'hex'), 'Mechanics of Materials', 'Force analysis, stress, strain, and structural analysis', 'manual', 'active', 8),
('engineering', 'Engineering', 'university', 'year-2', 'Engineering Mathematics II', encode(sha256('engineering:university:year-2:engineering mathematics ii'), 'hex'), 'Advanced Engineering Mathematics', 'Fourier analysis, Laplace transforms, and complex variables', 'manual', 'active', 9),
('engineering', 'Engineering', 'university', 'year-2', 'Thermodynamics for Engineers', encode(sha256('engineering:university:year-2:thermodynamics for engineers'), 'hex'), 'Engineering Thermodynamics', 'Heat transfer, energy systems, and thermodynamic cycles', 'manual', 'active', 8),
('engineering', 'Engineering', 'university', 'year-2', 'Fluid Mechanics', encode(sha256('engineering:university:year-2:fluid mechanics'), 'hex'), 'Fluid Mechanics', 'Fluid statics, dynamics, and flow analysis', 'manual', 'active', 8),
('engineering', 'Engineering', 'university', 'year-2', 'Circuit Analysis', encode(sha256('engineering:university:year-2:circuit analysis'), 'hex'), 'Electric Circuits', 'Kirchhoff laws, nodal/mesh analysis, and AC circuits', 'manual', 'active', 8),
('engineering', 'Engineering', 'university', 'year-2', 'Signals and Systems', encode(sha256('engineering:university:year-2:signals and systems'), 'hex'), 'Signals and Systems', 'Fourier transforms, Laplace transforms, and system analysis', 'manual', 'active', 7);

-- Psychology
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('psychology', 'Psychology', 'university', 'year-1', 'Introduction to Psychology', encode(sha256('psychology:university:year-1:introduction to psychology'), 'hex'), 'Psychology', 'History, methods, and major theories in psychology', 'manual', 'active', 9),
('psychology', 'Psychology', 'university', 'year-1', 'Developmental Psychology', encode(sha256('psychology:university:year-1:developmental psychology'), 'hex'), 'Developmental Psychology', 'Human development across the lifespan', 'manual', 'active', 8),
('psychology', 'Psychology', 'university', 'year-1', 'Research Methods in Psychology', encode(sha256('psychology:university:year-1:research methods in psychology'), 'hex'), 'Research Methods in Psychology', 'Experimental design, statistics, and scientific writing', 'manual', 'active', 8),
('psychology', 'Psychology', 'university', 'year-2', 'Cognitive Psychology', encode(sha256('psychology:university:year-2:cognitive psychology'), 'hex'), 'Cognitive Psychology', 'Attention, memory, language, and problem solving', 'manual', 'active', 8),
('psychology', 'Psychology', 'university', 'year-2', 'Social Psychology', encode(sha256('psychology:university:year-2:social psychology'), 'hex'), 'Social Psychology', 'Social cognition, attitudes, and group dynamics', 'manual', 'active', 8),
('psychology', 'Psychology', 'university', 'year-2', 'Abnormal Psychology', encode(sha256('psychology:university:year-2:abnormal psychology'), 'hex'), 'Abnormal Psychology', 'Mental disorders, diagnosis, and treatment', 'manual', 'active', 8),
('psychology', 'Psychology', 'university', 'year-2', 'Behavioral Neuroscience', encode(sha256('psychology:university:year-2:behavioral neuroscience'), 'hex'), 'Behavioral Neuroscience', 'Brain-behavior relationships and neuropsychology', 'manual', 'active', 7),
('psychology', 'Psychology', 'university', 'year-2', 'Statistics for Behavioral Science', encode(sha256('psychology:university:year-2:statistics for behavioral science'), 'hex'), 'Statistics for the Behavioral Sciences', 'Descriptive and inferential statistics for psychology research', 'manual', 'active', 7);

-- Economics
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('economics', 'Economics', 'university', 'year-1', 'Principles of Microeconomics', encode(sha256('economics:university:year-1:principles of microeconomics'), 'hex'), 'Microeconomics', 'Supply and demand, consumer behavior, and market structures', 'manual', 'active', 9),
('economics', 'Economics', 'university', 'year-1', 'Principles of Macroeconomics', encode(sha256('economics:university:year-1:principles of macroeconomics'), 'hex'), 'Macroeconomics', 'National income, inflation, unemployment, and monetary policy', 'manual', 'active', 9),
('economics', 'Economics', 'university', 'year-1', 'Mathematics for Economics', encode(sha256('economics:university:year-1:mathematics for economics'), 'hex'), 'Mathematics for Economics', 'Calculus, optimization, and matrix algebra for economics', 'manual', 'active', 8),
('economics', 'Economics', 'university', 'year-2', 'Intermediate Microeconomics', encode(sha256('economics:university:year-2:intermediate microeconomics'), 'hex'), 'Microeconomic Analysis', 'Utility maximization, production theory, and welfare economics', 'manual', 'active', 8),
('economics', 'Economics', 'university', 'year-2', 'Intermediate Macroeconomics', encode(sha256('economics:university:year-2:intermediate macroeconomics'), 'hex'), 'Macroeconomic Analysis', 'Economic growth, business cycles, and fiscal policy', 'manual', 'active', 8),
('economics', 'Economics', 'university', 'year-2', 'Econometrics', encode(sha256('economics:university:year-2:econometrics'), 'hex'), 'Introductory Econometrics', 'Regression analysis, hypothesis testing, and causal inference', 'manual', 'active', 7),
('economics', 'Economics', 'university', 'year-2', 'International Economics', encode(sha256('economics:university:year-2:international economics'), 'hex'), 'International Economics', 'Trade theory, exchange rates, and global markets', 'manual', 'active', 7),
('economics', 'Economics', 'university', 'year-2', 'Public Finance', encode(sha256('economics:university:year-2:public finance'), 'hex'), 'Public Finance', 'Government taxation, spending, and budget policy', 'manual', 'active', 6);

-- Business Management
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('business-management', 'Business Management', 'university', 'year-1', 'Introduction to Business', encode(sha256('business-management:university:year-1:introduction to business'), 'hex'), 'Business', 'Business environment, entrepreneurship, and business ethics', 'manual', 'active', 8),
('business-management', 'Business Management', 'university', 'year-1', 'Financial Accounting', encode(sha256('business-management:university:year-1:financial accounting'), 'hex'), 'Financial Accounting', 'Financial statements, accounting principles, and analysis', 'manual', 'active', 9),
('business-management', 'Business Management', 'university', 'year-1', 'Marketing Fundamentals', encode(sha256('business-management:university:year-1:marketing fundamentals'), 'hex'), 'Marketing Management', 'Marketing strategy, consumer behavior, and branding', 'manual', 'active', 8),
('business-management', 'Business Management', 'university', 'year-2', 'Organizational Behavior', encode(sha256('business-management:university:year-2:organizational behavior'), 'hex'), 'Organizational Behavior', 'Leadership, motivation, and team dynamics in organizations', 'manual', 'active', 8),
('business-management', 'Business Management', 'university', 'year-2', 'Strategic Management', encode(sha256('business-management:university:year-2:strategic management'), 'hex'), 'Strategic Management', 'Strategic analysis, formulation, and implementation', 'manual', 'active', 8),
('business-management', 'Business Management', 'university', 'year-2', 'Operations Management', encode(sha256('business-management:university:year-2:operations management'), 'hex'), 'Operations Management', 'Process design, quality management, and supply chains', 'manual', 'active', 7),
('business-management', 'Business Management', 'university', 'year-2', 'Human Resource Management', encode(sha256('business-management:university:year-2:human resource management'), 'hex'), 'Human Resource Management', 'Recruitment, training, and performance management', 'manual', 'active', 7),
('business-management', 'Business Management', 'university', 'year-2', 'Business Law', encode(sha256('business-management:university:year-2:business law'), 'hex'), 'Business Law', 'Contract law, corporate law, and regulatory compliance', 'manual', 'active', 6);

-- Law
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('law', 'Law', 'university', 'year-1', 'Introduction to Law', encode(sha256('law:university:year-1:introduction to law'), 'hex'), 'Introduction to Law', 'Legal systems, sources of law, and legal reasoning', 'manual', 'active', 9),
('law', 'Law', 'university', 'year-1', 'Constitutional Law', encode(sha256('law:university:year-1:constitutional law'), 'hex'), 'Constitutional Law', 'Constitutional principles, rights, and governmental structures', 'manual', 'active', 9),
('law', 'Law', 'university', 'year-1', 'Legal Writing and Research', encode(sha256('law:university:year-1:legal writing and research'), 'hex'), 'Legal Writing', 'Legal research methods and professional writing skills', 'manual', 'active', 8),
('law', 'Law', 'university', 'year-2', 'Contract Law', encode(sha256('law:university:year-2:contract law'), 'hex'), 'Contracts', 'Contract formation, interpretation, and remedies', 'manual', 'active', 9),
('law', 'Law', 'university', 'year-2', 'Tort Law', encode(sha256('law:university:year-2:tort law'), 'hex'), 'Torts', 'Negligence, strict liability, and intentional torts', 'manual', 'active', 8),
('law', 'Law', 'university', 'year-2', 'Criminal Law', encode(sha256('law:university:year-2:criminal law'), 'hex'), 'Criminal Law', 'Criminal offenses, defenses, and procedures', 'manual', 'active', 8),
('law', 'Law', 'university', 'year-2', 'Property Law', encode(sha256('law:university:year-2:property law'), 'hex'), 'Property Law', 'Real property, possessory rights, and land law', 'manual', 'active', 7),
('law', 'Law', 'university', 'year-2', 'Administrative Law', encode(sha256('law:university:year-2:administrative law'), 'hex'), 'Administrative Law', 'Government powers, judicial review, and regulatory agencies', 'manual', 'active', 7);

-- Accounting
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('accounting', 'Accounting', 'university', 'year-1', 'Financial Accounting Fundamentals', encode(sha256('accounting:university:year-1:financial accounting fundamentals'), 'hex'), 'Financial Accounting', 'Financial statements, ledger accounts, and accounting cycle', 'manual', 'active', 10),
('accounting', 'Accounting', 'university', 'year-1', 'Management Accounting Basics', encode(sha256('accounting:university:year-1:management accounting basics'), 'hex'), 'Managerial Accounting', 'Cost analysis, budgeting, and decision-making tools', 'manual', 'active', 9),
('accounting', 'Accounting', 'university', 'year-1', 'Business Mathematics', encode(sha256('accounting:university:year-1:business mathematics'), 'hex'), 'Business Mathematics', 'Interest calculations, annuities, and financial mathematics', 'manual', 'active', 7),
('accounting', 'Accounting', 'university', 'year-2', 'Advanced Financial Accounting', encode(sha256('accounting:university:year-2:advanced financial accounting'), 'hex'), 'Advanced Financial Accounting', 'Partnerships, consolidated statements, and foreign exchange', 'manual', 'active', 8),
('accounting', 'Accounting', 'university', 'year-2', 'Auditing', encode(sha256('accounting:university:year-2:auditing'), 'hex'), 'Auditing', 'Audit process, sampling, and audit reports', 'manual', 'active', 8),
('accounting', 'Accounting', 'university', 'year-2', 'Taxation', encode(sha256('accounting:university:year-2:taxation'), 'hex'), 'South African Taxation', 'Income tax, VAT, and tax planning', 'manual', 'active', 8),
('accounting', 'Accounting', 'university', 'year-2', 'Financial Management', encode(sha256('accounting:university:year-2:financial management'), 'hex'), 'Principles of Financial Management', 'Capital budgeting, working capital, and financial analysis', 'manual', 'active', 8),
('accounting', 'Accounting', 'university', 'year-2', 'Accounting Information Systems', encode(sha256('accounting:university:year-2:accounting information systems'), 'hex'), 'Accounting Information Systems', 'Systems design, controls, and ERP systems', 'manual', 'active', 6);

-- English / Academic Writing
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('english', 'English', 'university', 'year-1', 'Academic Writing Skills', encode(sha256('english:university:year-1:academic writing skills'), 'hex'), 'They Say / I Say', 'Essay writing, argumentation, and academic conventions', 'manual', 'active', 9),
('english', 'English', 'university', 'year-1', 'English Grammar and Usage', encode(sha256('english:university:year-1:english grammar and usage'), 'hex'), 'The Elements of Style', 'Grammar rules, punctuation, and style guidelines', 'manual', 'active', 7),
('english', 'English', 'university', 'year-1', 'Introduction to Literature', encode(sha256('english:university:year-1:introduction to literature'), 'hex'), 'The Norton Introduction to Literature', 'Analysis of poetry, fiction, and drama', 'manual', 'active', 8),
('english', 'English', 'university', 'year-2', 'Creative Writing', encode(sha256('english:university:year-2:creative writing'), 'hex'), 'Writing Fiction', 'Narrative techniques, character development, and storytelling', 'manual', 'active', 7),
('english', 'English', 'university', 'year-2', 'Professional Communication', encode(sha256('english:university:year-2:professional communication'), 'hex'), 'Professional Communication', 'Business writing, presentations, and interpersonal skills', 'manual', 'active', 8),
('english', 'English', 'university', 'year-2', 'Media Studies', encode(sha256('english:university:year-2:media studies'), 'hex'), 'Media Studies', 'Media literacy, representation, and digital media', 'manual', 'active', 6),
('english', 'English', 'university', 'year-2', 'Linguistics Introduction', encode(sha256('english:university:year-2:linguistics introduction'), 'hex'), 'Linguistics', 'Phonetics, syntax, semantics, and language acquisition', 'manual', 'active', 6);

-- Statistics / Data Science
insert into subject_topics (subject_key, subject_display, level, year, topic_label, topic_signature, textbook_ref, blurb, source, status, admin_weight) values
('statistics', 'Statistics', 'university', 'year-1', 'Probability Theory', encode(sha256('statistics:university:year-1:probability theory'), 'hex'), 'Probability and Statistics', 'Probability distributions, Bayes theorem, and random variables', 'manual', 'active', 9),
('statistics', 'Statistics', 'university', 'year-1', 'Statistical Inference', encode(sha256('statistics:university:year-1:statistical inference'), 'hex'), 'Statistical Inference', 'Estimation, hypothesis testing, and confidence intervals', 'manual', 'active', 9),
('statistics', 'Statistics', 'university', 'year-1', 'R Programming for Statistics', encode(sha256('statistics:university:year-1:r programming for statistics'), 'hex'), 'R for Data Science', 'Data manipulation, visualization, and statistical computing in R', 'manual', 'active', 8),
('statistics', 'Statistics', 'university', 'year-2', 'Regression Analysis', encode(sha256('statistics:university:year-2:regression analysis'), 'hex'), 'Applied Linear Statistical Models', 'Linear regression, logistic regression, and model diagnostics', 'manual', 'active', 9),
('statistics', 'Statistics', 'university', 'year-2', 'Machine Learning Fundamentals', encode(sha256('statistics:university:year-2:machine learning fundamentals'), 'hex'), 'An Introduction to Statistical Learning', 'Classification, resampling methods, and tree-based models', 'manual', 'active', 9),
('statistics', 'Statistics', 'university', 'year-2', 'Time Series Analysis', encode(sha256('statistics:university:year-2:time series analysis'), 'hex'), 'Time Series Analysis', 'ARIMA models, forecasting, and temporal data analysis', 'manual', 'active', 7),
('statistics', 'Statistics', 'university', 'year-2', 'Experimental Design', encode(sha256('statistics:university:year-2:experimental design'), 'hex'), 'Design and Analysis of Experiments', 'ANOVA, factorial designs, and experimental planning', 'manual', 'active', 7),
('statistics', 'Statistics', 'university', 'year-2', 'Multivariate Analysis', encode(sha256('statistics:university:year-2:multivariate analysis'), 'hex'), 'Applied Multivariate Statistics', 'PCA, factor analysis, and cluster analysis', 'manual', 'active', 6);