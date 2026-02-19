# 登录链路梳理
1. 随机生成24位纯字母字符串，类似“FKGEKANBBBBADHILLACEAAFC”
2. 将其作为cookie，cookie的键为ASPSESSIONIDCEQTSTBS，值为上面随机生成的字符串
3. 由于这个cookie是客户端随机生成的，目前并没有任何意义
4. 所以接下来使用post方法，传参为：
user=202308596&pwd=17318269035TL&lb=S&submit=&sign=e7a39b3bc356c6ccfd2736fb570cf0&hour_key=819929348661855286025327972118498133047381331063899536918199759489377416899358818930337690620558866971528661981289306036893755569067971881335133
注意其中user和pwd是实际客户端需要填写的参数，其他的则不变，就固定为我给你的值即可
5. 访问https://jiaowu.sicau.edu.cn/jiaoshi/bangong/check.asp
6.拿到响应报文，根据响应报文的响应体内容是否以“<script language=javascript”开头来判断是否登录成功，如果是则登录失败，否则登录成功
7. 当登录成功以后，我们先前随机生成的cookie就已经有意义了
8. 后续的所有请求都需要携带这个cookie，否则会被服务器拒绝
9. 然后尝试请求https://jiaowu.sicau.edu.cn/jiaoshi/bangong/main/welcome1.asp来判断是否能够获取我所希望的响应体
