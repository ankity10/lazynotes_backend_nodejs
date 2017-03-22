Notelet Backend
This repository is backend implementaion for Notelet Linux Application.

Dependencies
Development dependencies
MongoDb
Redis
node, npm
rabbitmq
Testing dependencies
Python3
pytest
pyredis (python redis clien)
pymongo (python mongo client)
pika (python rabbitmq client)
Installation Steps
Install development dependencies via package manager of oyur system like apt, dnf, yum, pacman etc.
Enable Rabbitmq Management plugin by running following code:
    rabbitmq-plugins enable rabbitmq_management
Then you will need a rabbitmqadmin python script file, you can find this file in root folder of repo. You need to copy it you /usr/bin folder.
    sudo cp rabbitmqadmin /usr/bin
After installing all the development dependencies, download node dependencies by running following command in root of repo.
    npm install
Checklist
Before going further please check once again that you have following packages installed in order to run the server.

Mongodb, Redis, Rabbitmq with management plugin enabled, node and npm.
Now since you have all the devlopment dependencies you can proceed further to start the server.
Starting the server
This command will launch the sevrer with 5 worker processes by default.

    node server
Testing Server
Install following dependencies by the command below in order to run tests. This command will download pytest, pymongo, pyredis, pika.

    python3 -m pip install -r requirements.txt
Steps to tests server
Start the server by command: “node server”
Run this command:
    npm test
Currently this command will only test Http REST Api.