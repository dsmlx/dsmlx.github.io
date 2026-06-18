# MovieReview

`moviereview` is a movie review sample application that shows how ordinary microservice workloads can use traffic management, observability, and security capabilities from Kdubbo Inherent Mesh.

The sample contains several independent services:

- `moviepage`: the page entry point.
- `details`: the movie details service.
- `reviews`: the review service, with `v1`, `v2`, and `v3` versions.
- `ratings`: the rating service.

Deploy the sample:

```bash
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/moviereview/deployment.yaml
```

Check the entry service:

```bash
kubectl get svc -n moviereview moviepage
```

Clean up the sample:

```bash
kubectl delete -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/moviereview/deployment.yaml --ignore-not-found=true
```
