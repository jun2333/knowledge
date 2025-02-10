## 字符串匹配算法

#### BF算法（brute force）:暴力匹配算法

假设主串长度为n，模式串长度为m；将n-m+1个子串与模式串进行比对，每次需要比对m个字符，所以最坏时间复杂度为O(m*n)

实际应用中字符串不会太长，而且子串与模式串比对中，遇到不匹配就会停止比对，所以一般不会比对m个字符。

#### RK算法（Rabin,Karp命名）：是BF算法优化版本

将n-m+1个子串和模式串各自求hash值进行比对

如何设计hash算法？

例如主串和模式串中由a-z这26个字母组成，则采用26进制表示并转化为十进制作为hash值；通过下图找出相邻子串中的规律，得出子串计算公式：

<img src="https://static001.geekbang.org/resource/image/c4/9c/c47b092408ebfddfa96268037d53aa9c.jpg" alt="img" style="zoom: 33%;" />

26^m这部分计算可以提前计算好，存在数组里。

<img src="https://static001.geekbang.org/resource/image/22/2f/224b899c6e82ec54594e2683acc4552f.jpg" alt="img" style="zoom:50%;" />

这里还有一个问题就是，模式串很长，相应的主串中的子串也会很长，通过上面的哈希算法计算得到的哈希值就可能很大，如果超过了计算机中整型数据可以表示的范围，那该如何解决呢？

将26进制按位求和作为hash值，如abc的hash值为1+2+3；这样基本上可以解决上面问题。那么新问题又来了，这样哈希冲突的概率会非常高！！

我们可以用质数表示，如abc的hash值为2+5+7，这样可以大大降低哈希冲突的概率~

当存在冲突的时候，比对hash值一致，我们可以进一步比对子串和模式串的值进行判断，若hash值不一致的情况下肯定不匹配~

时间复杂度：扫描一遍主串就可以得到所有子串的hash值，加上扫描模式串的hash值，时间复杂度为O(n)，当完全哈希冲突情况下会退化为O(n*m)

#### BM(Boyer-Moore)算法

1. 坏字符规则

    概念：主串和模式串按照模式串逆序匹配，没匹配的字符对应的主串字符叫做坏字符，记录对应模式串字符的下标为si

   <img src="https://static001.geekbang.org/resource/image/22/da/220daef736418df84367215647bca5da.jpg" alt="img" style="zoom:33%;" />

   我们把模式串中存在坏字符的下标记作xi，若不存在则xi为-1

   两种情况：

   若模式串不存在这个坏字符，则滑动到si+1位置

   若存在坏字符(存在多个取最大下标)，存在坏字符在模式串中的下标为xi，整个模式串滑动到si-xi

2. 好后缀规则

   概念：主串和模式串按照模式串逆序匹配，匹配到的子串叫做好后缀，记作{u}

   两种情况：

   检测模式串前面若不存在好后缀，则滑动到主串中{u}后面

   <img src="https://static001.geekbang.org/resource/image/de/cd/de97c461b9b9dbc42d35768db59908cd.jpg" alt="img" style="zoom:33%;" />

   若存在好后缀，记为{u *}，则将模式串滑动到子串{u *}与主串{u}对齐的位置

   <img src="https://static001.geekbang.org/resource/image/b9/63/b9785be3e91e34bbc23961f67c234b63.jpg" alt="img" style="zoom:33%;" />

第一种情况滑动过度，可能会错过模式串与主串匹配到的情况，比如：

<img src="https://static001.geekbang.org/resource/image/9b/70/9b3fa3d1cd9c0d0f914a9b1f518ad070.jpg" alt="img" style="zoom:33%;" />

这时候就需要找到好后缀的一个最长前缀子串，记为{v}；如上图的c ，然后将模式串滑动到与主串中{v}对齐的位置。

<img src="https://static001.geekbang.org/resource/image/6c/f9/6caa0f61387fd2b3109fe03d803192f9.jpg" alt="img" style="zoom:33%;" />

##### 算法实现部分：

坏字符部分实现：

```java
public int bm(char[] a, int n, char[] b, int m) {
  int[] bc = new int[SIZE]; // 记录模式串中每个字符最后出现的位置
  generateBC(b, m, bc); // 构建坏字符哈希表
  int i = 0; // i表示主串与模式串对齐的第一个字符
  while (i <= n - m) {
    int j;
    for (j = m - 1; j >= 0; --j) { // 模式串从后往前匹配
      if (a[i+j] != b[j]) break; // 坏字符对应模式串中的下标是j
    }
    if (j < 0) {
      return i; // 匹配成功，返回主串与模式串第一个匹配的字符的位置
    }
    // 这里等同于将模式串往后滑动j-bc[(int)a[i+j]]位
    i = i + (j - bc[(int)a[i+j]]); 
  }
  return -1;
}
```

好后缀部分实现：

1. 维护一个散列表存储模式串每个字符的位置，此处用一个长度为256的数组简单实现，下标对应字符的ASCII值

```java
private static final int SIZE = 256; // 全局变量或成员变量
private void generateBC(char[] b, int m, int[] bc) {
  for (int i = 0; i < SIZE; ++i) {
    bc[i] = -1; // 初始化bc
  }
  for (int i = 0; i < m; ++i) {
    int ascii = (int)b[i]; // 计算b[i]的ASCII值
    bc[ascii] = i;
  }
}
```

2. 准备suffix和prefix数组

suffix：key为子串{u *}长度，值表示与好后缀{u}匹配的{u *}在在模式串中的起始下标

prefix：key为子串{u *}长度，值为布尔值，表示是否存在前缀子串{v}

<img src="https://static001.geekbang.org/resource/image/27/83/279be7d64e6254dac1a32d2f6d1a2383.jpg" alt="img" style="zoom: 50%;" />

```java
// b表示模式串，m表示长度，suffix，prefix数组事先申请好了
private void generateGS(char[] b, int m, int[] suffix, boolean[] prefix) {
  for (int i = 0; i < m; ++i) { // 初始化
    suffix[i] = -1;
    prefix[i] = false;
  }
  for (int i = 0; i < m - 1; ++i) { // b[0, i]
    int j = i;
    int k = 0; // 公共后缀子串长度
    while (j >= 0 && b[j] == b[m-1-k]) { // 与b[0, m-1]求公共后缀子串
      --j;
      ++k;
      suffix[k] = j+1; //j+1表示公共后缀子串在b[0, i]中的起始下标
    }
    if (j == -1) prefix[k] = true; //如果公共后缀子串也是模式串的前缀子串
  }
}
```

完整代码实现：

```java
// a,b表示主串和模式串；n，m表示主串和模式串的长度。
public int bm(char[] a, int n, char[] b, int m) {
  int[] bc = new int[SIZE]; // 记录模式串中每个字符最后出现的位置
  generateBC(b, m, bc); // 构建坏字符哈希表
  int[] suffix = new int[m];
  boolean[] prefix = new boolean[m];
  generateGS(b, m, suffix, prefix);
  int i = 0; // j表示主串与模式串匹配的第一个字符
  while (i <= n - m) {
    int j;
    for (j = m - 1; j >= 0; --j) { // 模式串从后往前匹配
      if (a[i+j] != b[j]) break; // 坏字符对应模式串中的下标是j
    }
    if (j < 0) {
      return i; // 匹配成功，返回主串与模式串第一个匹配的字符的位置
    }
    int x = j - bc[(int)a[i+j]];
    int y = 0;
    if (j < m-1) { // 如果有好后缀的话
      y = moveByGS(j, m, suffix, prefix);
    }
    i = i + Math.max(x, y);
  }
  return -1;
}

// j表示坏字符对应的模式串中的字符下标; m表示模式串长度
private int moveByGS(int j, int m, int[] suffix, boolean[] prefix) {
  int k = m - 1 - j; // 好后缀长度
  if (suffix[k] != -1) return j - suffix[k] +1;//滑动到{u *}与{u}对齐位置
  for (int r = j+2; r <= m-1; ++r) { //从第二个字符开始，遍历好后缀{u}，检测是否存在前缀子串，若存在的话返回其起始位置
    if (prefix[m-r] == true) {
      return r;
    }
  }
  return m;//不存在前缀子串直接返回模式串长度
}
```

#### KMP算法

好前缀：主串模式串从前往后匹配，遇到坏字符时，前面已经匹配的字符叫作好前缀

<img src="https://static001.geekbang.org/resource/image/17/be/17ae3d55cf140285d1f34481e173aebe.jpg" alt="img" style="zoom:33%;" />

高效滑动模式串：

通过找到好前缀后缀子串的最长前缀子串{v}，长度记录为k，再更新j的值，达到滑动目的(j为坏字符对应的模式串字符下标记作j)

<img src="https://static001.geekbang.org/resource/image/da/8f/da99c0349f8fac27e193af8d801dbb8f.jpg" alt="img" style="zoom:33%;" />

类似BM算法的bc，suffix，prefix数组我们也提前生成一个next数组。

next数组定义：key为好前缀最后一个字符的下标，value为其最长可匹配前缀子串的最后一个字符，如下图：

<img src="https://static001.geekbang.org/resource/image/16/a8/1661d37cb190cb83d713749ff9feaea8.jpg" alt="img" style="zoom:50%;" />

有了next数组，KMP实现就很容易了，代码如下：

```java
// a, b分别是主串和模式串；n, m分别是主串和模式串的长度。
public static int kmp(char[] a, int n, char[] b, int m) {
  int[] next = getNexts(b, m);
  int j = 0;//坏字符对应模式串字符的下标
  for (int i = 0; i < n; ++i) {
    while (j > 0 && a[i] != b[j]) { // 一直找到a[i]和b[j]
      j = next[j - 1] + 1;//更新j为好前缀最长匹配子串最后字符下标加1
    }
    if (a[i] == b[j]) {
      ++j;
    }
    if (j == m) { // 找到匹配模式串的了
      return i - m + 1;
    }
  }
  return -1;
}
```

##### next数组实现原理:

寻找next[k]和next[k+1]的关系。模式串为a

1. 若next[k]的值下一位字符等于a[k+1]，则好前缀a[0,k]的最长匹配前缀子串的下一字符等于a[k+1]，所以好前缀a[0,k+1]的最长匹配前缀子串的最后一位字符下标为next[k]+1，那next[k+1]的值就为next[k]+1。

2. 若next[k]的值下一位字符不等于a[k+1]，则寻找好前缀a[0,k]的次长匹配前缀子串，若次长匹配前缀子串的下一位字符等于a[k+1]，则好前缀a[0,k+1]的最长匹配前缀子串的最后一位字符下标等于次长匹配前缀的最后一位字符下标+1

   如何求次长匹配前缀子串呢？可以转化为求好前缀a[0,k]的最长匹配前缀子串的最长匹配前缀子串，所以可判断next[next[k]]+1位置的字符是否等于a[k+1]，若不等于则继续求重复求次长匹配子串。

代码如下：

```java
// b表示模式串，m表示模式串的长度
private static int[] getNexts(char[] b, int m) {
  int[] next = new int[m];
  next[0] = -1;
  int k = -1;
  for (int i = 1; i < m; ++i) {
    while (k != -1 && b[k + 1] != b[i]) {
      k = next[k];//求最长匹配前缀子串的最长匹配前缀子串的末位下标
    }
    if (b[k + 1] == b[i]) {
      ++k;
    }
    next[i] = k;
  }
  return next;
}
```

结合之前KMP框架代码则为KMP算法完整代码

```java
// a, b分别是主串和模式串；n, m分别是主串和模式串的长度。
public static int kmp(char[] a, int n, char[] b, int m) {
  int[] next = getNexts(b, m);
  int j = 0;//坏字符对应模式串字符的下标
  for (int i = 0; i < n; ++i) {
    while (j > 0 && a[i] != b[j]) { // 一直找到a[i]和b[j]
      j = next[j - 1] + 1;//更新j为好前缀最长匹配子串最后字符下标加1（滑动模式串过程）
    }
    if (a[i] == b[j]) {
      ++j;
    }
    if (j == m) { // 找到匹配模式串的了
      return i - m + 1;
    }
  }
  return -1;
}
// b表示模式串，m表示模式串的长度
private static int[] getNexts(char[] b, int m) {
  int[] next = new int[m];
  next[0] = -1;
  int k = -1;
  for (int i = 1; i < m; ++i) {
    while (k != -1 && b[k + 1] != b[i]) {
      k = next[k];//求最长匹配前缀子串的最长匹配前缀子串的末位下标
    }
    if (b[k + 1] == b[i]) {
      ++k;
    }
    next[i] = k;
  }
  return next;
}
```

#### “Trie”树

概念：Trie 树的本质，就是利用字符串之间的公共前缀，将重复的前缀合并在一起

例如：我们有 6 个字符串，它们分别是：how，hi，her，hello，so，see，那trie树就是下面图示：

<img src="https://static001.geekbang.org/resource/image/28/32/280fbc0bfdef8380fcb632af39e84b32.jpg" alt="img" style="zoom:50%;" />

如何构建一个trie树？

通过数组来存储节点，假设字符有a-z这26个字母，我们将其ASCII码与a的ASCII码相减，得到数组下标

<img src="https://static001.geekbang.org/resource/image/f5/35/f5a4a9cb7f0fe9dcfbf29eb1e5da6d35.jpg" alt="img" style="zoom:50%;" />

```java
public class Trie {
  private TrieNode root = new TrieNode('/'); // 存储无意义字符

  // 往Trie树中插入一个字符串
  public void insert(char[] text) {
    TrieNode p = root;
    for (int i = 0; i < text.length; ++i) {
      int index = text[i] - 'a';//计算下标
      if (p.children[index] == null) {//不存在则插入
        TrieNode newNode = new TrieNode(text[i]);
        p.children[index] = newNode;
      }
      p = p.children[index];//存在就进入下一层
    }
    p.isEndingChar = true;//将叶节点结尾字符属性设置为true
  }

  // 在Trie树中查找一个字符串
  public boolean find(char[] pattern) {
    TrieNode p = root;
    for (int i = 0; i < pattern.length; ++i) {
      int index = pattern[i] - 'a';
      if (p.children[index] == null) {
        return false; // 不存在pattern
      }
      p = p.children[index];
    }
    if (p.isEndingChar == false) return false; // 不能完全匹配，只是前缀
    else return true; // 找到pattern
  }

  public class TrieNode {
    public char data;
    public TrieNode[] children = new TrieNode[26];
    public boolean isEndingChar = false;
    public TrieNode(char data) {
      this.data = data;
    }
  }
}
```

复杂度：

查询的时间复杂度，构建好trie树之后，查找一个字符串只需要遍历k次，k为字符串长度，即O(k)

空间复杂度会比较大，每个节点都需要用一个数组

#### AC自动机实现敏感词过滤

AC 自动机算法，全称是 Aho-Corasick 算法。其实，Trie 树跟 AC 自动机之间的关系，就像单串匹配中朴素的串匹配算法，跟 KMP 算法之间的关系一样，只不过前者针对的是多模式串而已。所以，AC 自动机实际上就是在 Trie 树之上，加了类似 KMP 的 next 数组，只不过此处的 next 数组是构建在树上罢了

失败指针指向最长匹配后缀子串的末尾字符

构建AC自动机代码：

```java
public void buildFailurePointer() {
  Queue<AcNode> queue = new LinkedList<>();
  root.fail = null;
  queue.add(root);
  while (!queue.isEmpty()) {
    AcNode p = queue.remove();
    for (int i = 0; i < 26; ++i) {//遍历本层所有节点
      AcNode pc = p.children[i];//获取p子节点的值
      if (pc == null) continue;
      if (p == root) {//根节点子节点的失败节点为根节点
        pc.fail = root;
      } else {
        AcNode q = p.fail;
        while (q != null) {
          AcNode qc = q.children[pc.data - 'a'];//获取q子树中是否存在与pc相等的节点
          if (qc != null) {
            pc.fail = qc;
            break;
          }
          q = q.fail;
        }
        if (q == null) {
          pc.fail = root;
        }
      }
      queue.add(pc);
    }
  }
}
```

最后构建出来的AC自动机：

<img src="https://static001.geekbang.org/resource/image/51/3c/5150d176502dda4adfc63e9b2915b23c.jpg" alt="img" style="zoom:50%;" />

如何在AC自动机上匹配主串?

```java
public void match(char[] text) { // text是主串
  int n = text.length;
  AcNode p = root;
  for (int i = 0; i < n; ++i) {//遍历主串
    int idx = text[i] - 'a';
    while (p.children[idx] == null && p != root) {
      p = p.fail; // 失败指针发挥作用的地方
    }
    p = p.children[idx];
    if (p == null) p = root; // 如果没有匹配的，从root开始重新匹配
    AcNode tmp = p;
    while (tmp != root) { // 打印出可以匹配的模式串
      if (tmp.isEndingChar == true) {
        int pos = i-tmp.length+1;
        System.out.println("匹配起始下标" + pos + "; 长度" + tmp.length);
      }
      tmp = tmp.fail;
    }
  }
}
```

