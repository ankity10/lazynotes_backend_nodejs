import subprocess
import logging as log
import sys
import os

log.basicConfig(format='%(levelname)s:%(message)s', level=log.INFO)


def start_redis():
    process_info = ""
    try:
        process_info = subprocess.run(str("redis-server &"), shell=True, stdout=subprocess.PIPE)
        return_code = process_info.returncode
        if return_code:
            log.error(
                "Failed to start redis: return code: " + str(return_code) + " Error: " + process_info.stdout.decode(
                    "utf-8"))
            sys.exit(1)
        elif return_code == 0:
            log.info("Started redis-server succesfully")

    except Exception as e:
        log.info("Exception while starting redis: ", e)
        sys.exit(1)


def start_rabbitmq():
    process_info = subprocess.run(["sudo", "service", "rabbitmq-server", "start"], stdout=subprocess.PIPE)
    return_code = process_info.returncode
    if return_code:
        log.error("Failed to start rabbitmq-server: return code: " + str(
            return_code) + " Error: " + process_info.stdout.decode("utf-8"))
        sys.exit(1)
    elif return_code == 0:
        log.info("Started rabbitmq-server succesfully")


def start_mongo():
    process_info = subprocess.run(["sudo", "service", "mongod", "start"], stdout=subprocess.PIPE)
    return_code = process_info.returncode
    if return_code:
        log.error("Failed to start MongoDb: return code: " + str(return_code) + " Error: " + process_info.stdout.decode(
            "utf-8"))
        sys.exit(1)
    elif return_code == 0:
        log.info("Started MongoDb succesfully")


def start_server():
    os.system("node server.js")


start_redis()
start_mongo()
start_rabbitmq()
start_server()
