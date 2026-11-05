#!/bin/sh
# 访问统计的两件准备，在 nginx 启动前执行（官方镜像会运行 /docker-entrypoint.d/ 里的脚本）：
#   1. 日志目录 /var/lib/cjy-stats —— 建议在 Zeabur 给它挂一个卷，重新部署也不丢数据；
#   2. /stats/ 的密码文件 —— 用户名 cjy，密码取自环境变量 STATS_PASSWORD；没设置就写空文件，谁也进不去。
#      用的是 nginx 的 {PLAIN} 写法：明文只在容器里，和环境变量本身一样可见。
set -eu
umask 022
mkdir -p /var/lib/cjy-stats
touch /var/lib/cjy-stats/hits.log
chmod 0755 /var/lib/cjy-stats
chmod 0644 /var/lib/cjy-stats/hits.log          # nginx 工作进程要能读（/stats/hits.log）
if [ -n "${STATS_PASSWORD:-}" ]; then
  printf 'cjy:{PLAIN}%s\n' "$STATS_PASSWORD" > /etc/nginx/cjy-stats.htpasswd
else
  : > /etc/nginx/cjy-stats.htpasswd
fi
# 只让 root 和 nginx 用户组读；没有 nginx 组时退回所有人可读（与环境变量本身的可见范围相同）
if chgrp nginx /etc/nginx/cjy-stats.htpasswd 2>/dev/null; then
  chmod 0640 /etc/nginx/cjy-stats.htpasswd
else
  chmod 0644 /etc/nginx/cjy-stats.htpasswd
fi
