# Usage

- Activate virtual environment
- `mkdocs serve`

# Components

This is two in one. It is my personal website but also my custom theme. The theme is very basic but adds support that the parent element of a navigation element can also be a page. Noramlly in mkdocs given the following navigation structure:

```yaml
nav:
  - Programming: programming.md
  - Research: research.md
  - Politics: politics.md
  - Blog:
    - Opinions: blog/thoughts.md
    - Philosophy: blog/philosophy.md
    - Science: blog/science.md
  - Book:
    - The Book: book/the-book.md
    - Influential Books: book/influential-books.md
    - Lessons from My Book: book/lessons-from-my-book.md
```

The elements `Blog` and `Book` would not be clickable and not have an associated `.md` file.

I added that these expect that there should be a `blog.md` and a `book.md` file respectively. In addition I added custom logic for the navigation to detect if we are currently in one of these files.