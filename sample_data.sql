-- ============================================================
-- SMART LIBRARY — SAMPLE DATA
-- Run AFTER schema.sql and rls_policies.sql
-- Note: profiles/members/librarians are created automatically when
-- someone signs up through Supabase Auth (see auth.js). This file
-- only seeds the catalog data (authors, categories, books, copies).
-- ============================================================

-- Categories
insert into categories (category_name, description) values
  ('Programming', 'Programming languages and software development'),
  ('Database', 'Database systems and management'),
  ('Networking', 'Computer networks and protocols'),
  ('Data Structures', 'Data structures and algorithms'),
  ('Operating Systems', 'OS concepts and design'),
  ('Computer Science', 'General computer science'),
  ('Mathematics', 'Engineering mathematics'),
  ('English', 'English language and literature'),
  ('Kannada', 'Kannada language and literature'),
  ('History', 'Indian and world history'),
  ('General Knowledge', 'General knowledge and reference');

-- Publishers
insert into publishers (publisher_name, email, phone) values
  ('BPB Publications', 'contact@bpb.example', '9876543210'),
  ('Pearson Education', 'contact@pearson.example', '9876543211'),
  ('McGraw Hill', 'contact@mheducation.example', '9876543212'),
  ('Prentice Hall India', 'contact@prenticehall.example', '9876543213'),
  ('Sapna Book House', 'contact@sapna.example', '9876543214');

-- Authors
insert into authors (author_name, country) values
  ('Yashavant Kanetkar', 'India'),
  ('E. Balagurusamy', 'India'),
  ('Wes McKinney', 'USA'),
  ('Narasimha Karumanchi', 'India'),
  ('Abraham Silberschatz', 'USA'),
  ('Andrew S. Tanenbaum', 'Netherlands'),
  ('Herbert Schildt', 'USA'),
  ('Roger S. Pressman', 'USA'),
  ('B. S. Grewal', 'India'),
  ('Kuvempu', 'India'),
  ('Ramachandra Guha', 'India');

-- Shelves
insert into shelves (shelf_code, shelf_name, floor, section) values
  ('CS-01', 'Computer Science A', 'Ground', 'A'),
  ('CS-02', 'Computer Science B', 'Ground', 'B'),
  ('DB-01', 'Database Systems', 'Ground', 'C'),
  ('NET-01', 'Networking', 'First', 'A'),
  ('REF-01', 'Reference & GK', 'First', 'B'),
  ('LANG-01', 'Language & Literature', 'First', 'C');

-- Books (author/category/publisher looked up by name for readability)
insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9788183331630', 'Let Us C', a.id, c.id, p.id, 'English', 2020, '17th', 350,
  'A comprehensive guide to the C programming language.'
from authors a, categories c, publishers p
where a.author_name='Yashavant Kanetkar' and c.category_name='Programming' and p.publisher_name='BPB Publications';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9780070681653', 'Programming in ANSI C', a.id, c.id, p.id, 'English', 2019, '8th', 450,
  'Classic reference for ANSI C programming.'
from authors a, categories c, publishers p
where a.author_name='E. Balagurusamy' and c.category_name='Programming' and p.publisher_name='McGraw Hill';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9789352136155', 'Python Programming', a.id, c.id, p.id, 'English', 2021, '2nd', 550,
  'Data analysis and application development in Python.'
from authors a, categories c, publishers p
where a.author_name='Wes McKinney' and c.category_name='Programming' and p.publisher_name='Pearson Education';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9788192107547', 'Data Structures Using Python', a.id, c.id, p.id, 'English', 2020, '1st', 480,
  'Data structures and algorithms with Python examples.'
from authors a, categories c, publishers p
where a.author_name='Narasimha Karumanchi' and c.category_name='Data Structures' and p.publisher_name='BPB Publications';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9780073523323', 'Database Management Systems', a.id, c.id, p.id, 'English', 2019, '6th', 650,
  'Foundations of database design and management.'
from authors a, categories c, publishers p
where a.author_name='Abraham Silberschatz' and c.category_name='Database' and p.publisher_name='McGraw Hill';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9780132126953', 'Computer Networks', a.id, c.id, p.id, 'English', 2018, '5th', 600,
  'Comprehensive introduction to computer networking.'
from authors a, categories c, publishers p
where a.author_name='Andrew S. Tanenbaum' and c.category_name='Networking' and p.publisher_name='Prentice Hall India';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9781119800366', 'Operating System Concepts', a.id, c.id, p.id, 'English', 2021, '10th', 700,
  'Core concepts of modern operating systems.'
from authors a, categories c, publishers p
where a.author_name='Abraham Silberschatz' and c.category_name='Operating Systems' and p.publisher_name='Pearson Education';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9789355321016', 'Java: The Complete Reference', a.id, c.id, p.id, 'English', 2022, '12th', 750,
  'Comprehensive coverage of the Java language.'
from authors a, categories c, publishers p
where a.author_name='Herbert Schildt' and c.category_name='Programming' and p.publisher_name='McGraw Hill';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9780078022128', 'Software Engineering', a.id, c.id, p.id, 'English', 2019, '9th', 620,
  'A practitioner''s approach to software engineering.'
from authors a, categories c, publishers p
where a.author_name='Roger S. Pressman' and c.category_name='Computer Science' and p.publisher_name='McGraw Hill';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9788121904077', 'Engineering Mathematics', a.id, c.id, p.id, 'English', 2020, '44th', 400,
  'Standard reference for engineering mathematics.'
from authors a, categories c, publishers p
where a.author_name='B. S. Grewal' and c.category_name='Mathematics' and p.publisher_name='Sapna Book House';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9788172016623', 'Kannada Literature Anthology', a.id, c.id, p.id, 'Kannada', 2015, '3rd', 300,
  'A collection of classic Kannada literary works.'
from authors a, categories c, publishers p
where a.author_name='Kuvempu' and c.category_name='Kannada' and p.publisher_name='Sapna Book House';

insert into books (isbn, title, author_id, category_id, publisher_id, language, publication_year, edition, price, description)
select '9780330439497', 'India After Gandhi', a.id, c.id, p.id, 'English', 2017, '2nd', 550,
  'A history of the world''s largest democracy.'
from authors a, categories c, publishers p
where a.author_name='Ramachandra Guha' and c.category_name='History' and p.publisher_name='Pearson Education';

-- Book copies (2-4 copies per book, spread across statuses/shelves)
insert into book_copies (book_id, accession_number, shelf_id, condition, status, purchase_date, purchase_price)
select b.id, 'ACC-' || lpad((row_number() over (order by b.title))::text, 4, '0') || '-1',
  s.id, 'good', 'available', current_date - interval '2 years', b.price
from books b
join categories c on c.id = b.category_id
join shelves s on
  (c.category_name in ('Programming','Data Structures','Computer Science') and s.shelf_code='CS-01') or
  (c.category_name = 'Database' and s.shelf_code='DB-01') or
  (c.category_name in ('Networking','Operating Systems') and s.shelf_code='NET-01') or
  (c.category_name in ('English','Kannada','History') and s.shelf_code='LANG-01') or
  (c.category_name in ('Mathematics','General Knowledge') and s.shelf_code='REF-01');

insert into book_copies (book_id, accession_number, shelf_id, condition, status, purchase_date, purchase_price)
select b.id, 'ACC-' || lpad((row_number() over (order by b.title))::text, 4, '0') || '-2',
  s.id, 'good', 'available', current_date - interval '1 years', b.price
from books b
join categories c on c.id = b.category_id
join shelves s on
  (c.category_name in ('Programming','Data Structures','Computer Science') and s.shelf_code='CS-02') or
  (c.category_name = 'Database' and s.shelf_code='DB-01') or
  (c.category_name in ('Networking','Operating Systems') and s.shelf_code='NET-01') or
  (c.category_name in ('English','Kannada','History') and s.shelf_code='LANG-01') or
  (c.category_name in ('Mathematics','General Knowledge') and s.shelf_code='REF-01');
