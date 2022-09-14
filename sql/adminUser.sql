-- also a part of the schema.sql file but seems right to separate it out too

INSERT INTO `users` (`id`, `email`, `password`, `salt`, `year`, `admin`, `student`) VALUES
('admin', 'admin@example.com', SHA2('passwordabc', 256), 'abc', 0, 1, 0);