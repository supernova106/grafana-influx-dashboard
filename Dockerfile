FROM grafana/grafana:4.2.0
ENV SCRIPTED_FOLDER /usr/share/grafana/public/dashboards

#ADD getdash.js /getdash.js
#ADD getdash.app.js /getdash.app.js
#ADD getdash.conf.js /getdash.conf.js
#ADD dash.js ${SCRIPTED_FOLDER}/dash.js
#ADD scripted.js ${SCRIPTED_FOLDER}/scripted.js

#ADD install.sh /install.sh
#RUN chmod +x /install.sh

#RUN ./install.sh /usr/share/grafana
