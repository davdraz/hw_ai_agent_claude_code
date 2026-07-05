-- Csak egyszer fut le, a Postgres konténer első indításakor (üres data volume mellett).
-- Két szerepkör: az app (read-write, Prisma migrate/seed) és a readonly (az agent runSql toolja).

CREATE ROLE plantbase_app WITH LOGIN PASSWORD 'plantbase_app';
GRANT ALL PRIVILEGES ON DATABASE plantbase TO plantbase_app;
GRANT ALL ON SCHEMA public TO plantbase_app;

CREATE ROLE plantbase_readonly WITH LOGIN PASSWORD 'plantbase_readonly';
GRANT CONNECT ON DATABASE plantbase TO plantbase_readonly;
GRANT USAGE ON SCHEMA public TO plantbase_readonly;

-- Amit a plantbase_app később létrehoz (pl. Prisma migráció a `products` táblát),
-- azon automatikusan SELECT jogot kap a plantbase_readonly.
ALTER DEFAULT PRIVILEGES FOR ROLE plantbase_app IN SCHEMA public
  GRANT SELECT ON TABLES TO plantbase_readonly;
