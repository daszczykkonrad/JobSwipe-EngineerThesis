import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='postgres', user='postgres', password='Admin1234')
cur = conn.cursor()
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")
print(cur.fetchall())
cur.close()
conn.close()
