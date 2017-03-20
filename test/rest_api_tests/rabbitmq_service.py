#!/usr/bin/python3

import logging as log
import pika
import requests as req
import subprocess
import traceback

log.basicConfig(format='%(levelname)s:%(message)s', level=log.INFO)


class Rabbitmq():
    def __init__(self):
        self.connect()
        self.create_channel()

    def __del__(self):
        self.channel.close()
        self.connection.close()

    def insert(self, queue_name, message):
        try:
            self.channel.basic_publish(exchange='',
                                       routing_key=queue_name,
                                       body=message)
            log.info(" [x] Sent 'Hello World!' in queue {}".format(queue_name))
        except Exception as e:
            log.error(traceback.print_exc())

    def connect(self):
        try:
            self.connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
            log.info("Connection with Rabbitmq created successfully")
        except Exception as e:
            log.error(traceback.print_exc())

    def create_channel(self):
        try:
            self.channel = self.connection.channel()
            log.info("Channel created successfully")
        except Exception as e:
            log.error(traceback.print_exc())

    def create_queue(self, queue_name):
        try:
            self.channel.queue_declare(queue=queue_name, durable=True)
            log.info("New Queue created with name '{}'".format(queue_name))
        except Exception as e:
            log.error(traceback.print_exc())

    def delete_queue(self, queue_name):
        try:
            self.channel.queue_delete(queue=queue_name)
            log.info("Queue '{}' deleted successfully".format(queue_name))
        except Exception as e:
            log.error(traceback.print_exc())

    def get_message_count(self, queue_name):
        try:
            res = req.get('http://guest:guest@localhost:15672/api/queues/%2f/' + queue_name, )
            count = res.json()['backing_queue_status']['len']
            log.info("Message count is {}".format(count))
            return count
        except Exception as e:
            log.error(traceback.print_exc())

    def get_all_queue(self):
        return self._get_all_queue()

    def get_queue_count(self):
        return len(self._get_all_queue())

    def delete_all_queue(self):
        for queue in self.get_all_queue():
            self.delete_queue(queue)

    def _get_all_queue(self):
        process_info = subprocess.run(["rabbitmqadmin", "-f", "tsv", "-q", "list", "queues", "name"],
                                      stdout=subprocess.PIPE)
        str_output = process_info.stdout.decode("utf-8")
        queue_list = [queue for queue in str_output.split("\n") if queue]
        return queue_list
