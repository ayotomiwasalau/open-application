# TechTreds Web Application

This is a Flask application that lists the latest articles within the cloud-native ecosystem.

## Run 

To run this application there are 2 steps required:

1. Initialize the database by using the `python init_db.py` command. This will create or overwrite the `database.db` file that is used by the web application.
2.  Run the TechTrends application by using the `python app.py` command. The application is running on port `3111` and you can access it by querying the `http://127.0.0.1:3111/` endpoint.

kubectl port-forward service/app-server --address 0.0.0.0 3111:3111 --namespace dev &
kubectl port-forward service/app-db --address 0.0.0.0 5432:5432 --namespace dev

 
kubectl port-forward service/argocd-server-nodeport --address 0.0.0.0 30008:30008 --namespace argocd


PASSWORD=$(kubectl get secret db-secret \
  -n observability \
  -o jsonpath="{.data.postgresql-password}" | base64 --decode)