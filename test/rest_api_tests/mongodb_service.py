import pymongo
import logging as log
log.basicConfig(format='%(levelname)s:%(message)s', level=log.INFO)


class MongoDb():
    def __init__(self):
        self.db_client = pymongo.MongoClient(host='localhost',
                                             port=27017,
                                             connectTimeoutMS=10000,
                                             serverSelectionTimeoutMS=8000)
        try:
            self.db_client.admin.command('ismaster')
            log.info("Successfully connected to MongoDb...!!")
        except pymongo.errors.ConnectionFailure:
            log.error("Could not connect to MongoDB")
            log.error("Application startup cannot proceed. Apllication is exiting.")
            log.error("Please check your mongoDB connection and try again.")
            exit()

        self.db = self.db_client.lazynotes_backend

    def drop(self, **kwargs):
        if kwargs.get('collection', None):
            self.db.drop_collection(kwargs['collection'])
            log.info("Collection '" + kwargs['collection'] + "' deleted successfully")
        elif kwargs.get('db', None):
            self.db_client.drop_database(kwargs['db'])
            log.info("Mongo Database '"+kwargs['db']+ "' deleted successfully")

    def insert(self, collection, data):
        return self.db.get_collection(collection).insert_one(data)

    def find(self, collection, filter=None):
        if filter and isinstance(filter, dict):
            return self.db.get_collection(collection).find(filter)
        return self.db.get_collection(collection).find({})

