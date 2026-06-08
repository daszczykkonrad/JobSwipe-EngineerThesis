import psycopg2
from pathlib import Path

sql = Path('db/schema.sql').read_text()
conn = psycopg2.connect(host='localhost', port=5432, dbname='postgres', user='postgres', password='Admin1234')
cur = conn.cursor()
cur.execute(sql)
conn.commit()
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public';")
print('tables=', cur.fetchall())
cur.close()
conn.close()
