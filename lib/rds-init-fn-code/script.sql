CREATE TABLE IF NOT EXISTS Todolist (
  id SERIAL PRIMARY KEY,
  todo_name VARCHAR(255),
  todo_description VARCHAR(255),
  todo_completed BOOLEAN
);

INSERT INTO
  Todolist (
    todo_name,
    todo_description,
    todo_completed
  )
VALUES
  (
    'First todo',
    'That''s a todo for demonstration purposes',
    true
  );
