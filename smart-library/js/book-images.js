// Shared book cover mapping used by catalog and detail pages.

const BOOK_IMAGES = {
  'Computer Networks': 'computer-networks.jpeg',
  'Data Structures Using Python': 'data-structures-using-python.jpg',
  'Database Management Systems': 'database-management-systems.jpg',
  'Engineering Mathematics': 'engineering-mathematics.jpg',
  'India After Gandhi': 'india-after-gandhi.jpg',
  'Java: The Complete Reference': 'java-the-complete-reference.jpg',
  'Kannada Literature Anthology': 'kannada-literature-anthology.jpg',
  'Let Us C': 'let-us-c.jpeg',
  'Operating System Concepts': 'operating-system-concepts.jpg',
  'Programming in ANSI C': 'programming-in-ansi-c.jpeg',
  'Python Programming': 'python-for-data-analysis.jpg',
  'Software Engineering': 'software-engineering.png',
};

export function getBookImage(title) {
  const filename = BOOK_IMAGES[title];
  return filename ? `assets/books/${filename}` : 'assets/books/book-placeholder.svg';
}
