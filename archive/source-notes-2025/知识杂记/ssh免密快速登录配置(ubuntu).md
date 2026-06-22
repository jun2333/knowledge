# ssh免密快速登录配置(ubuntu)

客户端：ssh-keygen生成密钥

将id_rsa.pub内容拷贝到服务器~/.ssh/authorized_keys里（若无则创建）

```
//此时可以使用ssh免密登录了
ssh username@host
```

在.ssh目录下配置config文件可以直接输入ssh 服务名 登录

```
Host server
Hostname 172.18.60.164
Port 22
User matt
```

服务器：

安装openssh-server打开ssh服务

```
sudo apt install openssh-server
```

查看sshd服务是否启动，若列表无sshd服务则手动启动sudo service ssh start

```
ps -e | grep 'ssh'
```

