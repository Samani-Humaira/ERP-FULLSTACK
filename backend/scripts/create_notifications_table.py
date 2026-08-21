from app.database import Base, engine
import app.models.collaboration as collab

print('Creating/ensuring tables...')
Base.metadata.create_all(bind=engine)
print('Done creating tables (including notifications).')
