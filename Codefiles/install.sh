
#Installation instructions:

#TO install and run the application, cd to directory Codefiles, and type in terminal:
# sudo chmod a+x install.sh
# sudo ./install.sh

#To run the application on localhost port localhost:27017/ece651
# cd to directory named Codefiles and type in terminal
# ./mongod
#Open another terminal, cd to Codefiles and type
# node app.js

#The following commands install the node application packages (see package.json)
sudo apt-get install -y npm
sudo npm install body-parser --save
sudo npm install ejs --save
sudo npm install express --save
sudo npm install mongoose --save

npm install passport passport-local passport-local-mongoose express-session --save


# To set up local database. follow the following commands. Ensure the database is set up outside the local repository
# sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
# echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
# sudo apt-get update
# sudo apt-get install -y mongodb-org
# mkdir data
# echo "mongod --dbpath=data --nojournal" > mongod
# chmod a+x mongod
