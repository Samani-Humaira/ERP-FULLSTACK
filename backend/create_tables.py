from app.database import Base, engine
from app.models import collaboration, project, user

print('Creating tables...')
Base.metadata.create_all(bind=engine)
print('Done')
