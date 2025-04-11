This is a fork of UnityWebModkit to support more modern Unity versions, as well as to fix some bugs. It isn't really ready to be used, has a ton of code that exists solely for debugging purposes, is very buggy, etc etc.

If you make any changes to fix a bug or support a new game, please send a PR!

I'll be maintaining this, but I won't be adding any significant new features since I'm working on a better modding solution (more akin to il2cppinterop, or modding desktop games with c++).

This fork's changes to UWM are licensed as CC BY-NC-SA (https://creativecommons.org/licenses/by-nc-sa/4.0/). The original UWM code is under the MIT license.

Example use

import via userscript
```
// ==UserScript==
// @name         Unity Web Modkit Import
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Imports Unity Web Modkit
// @author       You
// @match        *://*/*
// @grant        none
// @require      https://raw.githubusercontent.com/amir16yp/UnityWebModkit/refs/heads/main/dist/unity-web-modkit.0a68cba3d1cd5032a745.js
// ==/UserScript==

(function() {
    // your code here (if needed)
})();
```

```
UnityWebModkit.Runtime.createPlugin({  
        name: 'Mod',
        version: '1.0.0',
        referencedAssemblies: ['Assembly-CSharp.dll', 'PhotonUnityNetworking.dll', 'mscorlib.dll']
}});
```
small example for hooking
```
this.ctx!.hookPrefix({ typeName: 'ExplosiveBarrel', methodName: '.ctor', params: ['i32', 'i32'] }, (ptr) => {
    this.logger!.message('ExplosiveBarrel::ctor ran');
    this.instances.barrels.push(ptr);
});
```
