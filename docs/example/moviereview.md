# MovieReview

`moviereview` 是一个电影评论示例应用，用于演示普通微服务业务在 Kdubbo Inherent Mesh 中获得流量治理、可观测性和安全能力。

该示例由多个独立服务组成：

- `moviepage`：页面入口。
- `details`：电影详情服务。
- `reviews`：评论服务，包含 `v1`、`v2`、`v3` 三个版本。
- `ratings`：评分服务。

部署示例：

```bash
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/moviereview/deployment.yaml
```

查看入口服务：

```bash
kubectl get svc -n moviereview moviepage
```

清理示例：
```bash
kubectl delete -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/moviereview/deployment.yaml --ignore-not-found=true
```
