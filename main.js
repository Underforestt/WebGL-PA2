'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let stereoCamera;
let controlKit, panel;
let objConv = {
    conv: 1000, range: [0, 1000]
}
let objEyes = {
    eyes: 100, range: [1, 100]
}
let ui;
let texture, texture2, camera, surface2;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Constructor
function StereoCamera(
    Convergence,
    EyeSeparation,
    AspectRatio,
    FOV,
    NearClippingDistance,
    FarClippingDistance
) {
    this.mConvergence = Convergence;
    this.mEyeSeparation = EyeSeparation;
    this.mAspectRatio = AspectRatio;
    this.mFOV = FOV
    this.mNearClippingDistance = NearClippingDistance;
    this.mFarClippingDistance = FarClippingDistance;

    this.ApplyLeftFrustum = function() {
        let top, bottom, left, right;

        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        const a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;

        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        left = -b * this.mNearClippingDistance / this.mConvergence;
        right = c * this.mNearClippingDistance / this.mConvergence;

        let projectionMatrix = m4.frustum(left, right, bottom, top,
            this.mNearClippingDistance, this.mFarClippingDistance)
        let modelViewMatrix = m4.multiply(m4.translation(0.01 * this.mEyeSeparation / 2, 0.0, 0.0), m4.identity());
        return { p: projectionMatrix, m: modelViewMatrix }
    }

    this.ApplyRightFrustum = function() {
        let top, bottom, left, right;

        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        const a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;

        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        left = -c * this.mNearClippingDistance / this.mConvergence;
        right = b * this.mNearClippingDistance / this.mConvergence;

        let projectionMatrix1 = m4.frustum(left, right, bottom, top,
            this.mNearClippingDistance, this.mFarClippingDistance)
        let modelViewMatrix1 = m4.multiply(m4.translation(-0.01 * this.mEyeSeparation / 2, 0.0, 0.0), m4.identity());
        return [projectionMatrix1, modelViewMatrix1]
    }
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iVertexBuffer2 = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.BufferData2 = function(vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer2);
        gl.vertexAttribPointer(shProgram.iAttribVertex2, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex2);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.identity());
    // gl.bindTexture(gl.TEXTURE_2D, texture2);
    // gl.texImage2D(
    //     gl.TEXTURE_2D,
    //     0,
    //     gl.RGBA,
    //     gl.RGBA,
    //     gl.UNSIGNED_BYTE,
    //     camera
    // );
    // surface2.Draw();
    // gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -4);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection;
    let matrices = stereoCamera.ApplyLeftFrustum();
    modelViewProjection = m4.multiply(matrices.p, m4.multiply(matrices.m, matAccum1));
    if (magAccessed) {
        // modelViewProjection = m4.multiply(matrices.p, m4.multiply(matrices.m, m4.multiply(matAccum1, m4.zRotation(deg2rad(heading)))));
        modelViewProjection = m4.multiply(matrices.p, m4.multiply(matrices.m, m4.multiply(matAccum1, rotationMatrix)));
    }
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(true, false, false, false);

    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);

    [matrices.p,
    matrices.m] = stereoCamera.ApplyRightFrustum();
    modelViewProjection = m4.multiply(matrices.p, m4.multiply(matrices.m, matAccum1));
    if (magAccessed) {
        // modelViewProjection = m4.multiply(matrices.p, m4.multiply(matrices.m, m4.multiply(matAccum1, m4.zRotation(deg2rad(heading)))));
        modelViewProjection = m4.multiply(matrices.p, m4.multiply(matrices.m, m4.multiply(matAccum1, rotationMatrix)));
    }
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(false, true, true, false);

    surface.Draw();
    gl.colorMask(true, true, true, true);
}

function CreateSurfaceData() {
    let vertexList = [];
    for (let v = 0; v <= 1.5 * Math.PI * 100; v += 20) {
        for (let u = 0; u <= 14.5 * Math.PI * 100; u += 20) {
            let x = (u / 100) * Math.cos(Math.cos(u / 100)) * Math.cos(v / 100);
            let y = (u / 100) * Math.cos(Math.cos(u / 100)) * Math.sin(v / 100);
            let z = (u / 100) * Math.sin(Math.cos(u / 100));
            vertexList.push(x / 20, y / 20, z / 20);
            x = ((u + 20) / 100) * Math.cos(Math.cos((u + 20) / 100)) * Math.cos(v / 100);
            y = ((u + 20) / 100) * Math.cos(Math.cos((u + 20) / 100)) * Math.sin(v / 100);
            z = ((u + 20) / 100) * Math.sin(Math.cos((u + 20) / 100));
            vertexList.push(x / 20, y / 20, z / 20);
            x = (u / 100) * Math.cos(Math.cos(u / 100)) * Math.cos((v + 20) / 100);
            y = (u / 100) * Math.cos(Math.cos(u / 100)) * Math.sin((v + 20) / 100);
            z = (u / 100) * Math.sin(Math.cos(u / 100));
            vertexList.push(x / 20, y / 20, z / 20);
            x = (u / 100) * Math.cos(Math.cos(u / 100)) * Math.cos((v + 20) / 100);
            y = (u / 100) * Math.cos(Math.cos(u / 100)) * Math.sin((v + 20) / 100);
            z = (u / 100) * Math.sin(Math.cos(u / 100));
            vertexList.push(x / 20, y / 20, z / 20);
            x = ((u + 20) / 100) * Math.cos(Math.cos((u + 20) / 100)) * Math.cos(v / 100);
            y = ((u + 20) / 100) * Math.cos(Math.cos((u + 20) / 100)) * Math.sin(v / 100);
            z = ((u + 20) / 100) * Math.sin(Math.cos((u + 20) / 100));
            vertexList.push(x / 20, y / 20, z / 20);
            x = ((u + 20) / 100) * Math.cos(Math.cos((u + 20) / 100)) * Math.cos((v + 20) / 100);
            y = ((u + 20) / 100) * Math.cos(Math.cos((u + 20) / 100)) * Math.sin((v + 20) / 100);
            z = ((u + 20) / 100) * Math.sin(Math.cos((u + 20) / 100));
            vertexList.push(x / 20, y / 20, z / 20);
        }
    }
    return vertexList;
}

function CreateSurfaceData2() {
    let lim_u = 14.5 * Math.PI * 100;
    let lim_v = 1.5 * Math.PI * 100;
    let vertexList = [];
    for (let v = 0; v <= 1.5 * Math.PI * 100; v += 20) {
        for (let u = 0; u <= 14.5 * Math.PI * 100; u += 20) {
            vertexList.push(map(u, 0, lim_u, 0, 10), map(v, 0, lim_v, 0, 1));
            vertexList.push(map(u + 20, 0, lim_u, 0, 10), map(v, 0, lim_v, 0, 1));
            vertexList.push(map(u, 0, lim_u, 0, 10), map(v + 20, 0, lim_v, 0, 1));
            vertexList.push(map(u, 0, lim_u, 0, 10), map(v + 20, 0, lim_v, 0, 1));
            vertexList.push(map(u + 20, 0, lim_u, 0, 10), map(v, 0, lim_v, 0, 1));
            vertexList.push(map(u + 20, 0, lim_u, 0, 10), map(v + 20, 0, lim_v, 0, 1));
        }
    }
    return vertexList;
}

function map(value, a, b, c, d) {
    value = (value - a) / (b - a);
    return c + value * (d - c);
}

function LoadTexture() {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "https://static.turbosquid.com/Preview/2014/08/01__12_04_02/StoneWall1.jpg74B4E88B-474F-48E4-9873E560133A603E.jpgLarger.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribVertex2 = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    LoadTexture()
    // controlKit = new ControlKit();
    // panel = controlKit.addPanel()
    ui = new UIL.Gui({ w: 300 })

    texture2 = CreateTexture();
    stereoCamera = new StereoCamera(270, 100, 1, 1.6, 1, 10);
    ui.add(stereoCamera, 'mConvergence', { type: 'slide', min: 60, max: 270, step: 10 }).onChange(draw)
    ui.add(stereoCamera, 'mEyeSeparation', { type: 'slide', min: 0, max: 100, step: 1 }).onChange(draw)
    ui.add(stereoCamera, 'mFOV', { type: 'slide', min: 0.01, max: 3.13, step: 0.01 }).onChange(draw)
    ui.add(stereoCamera, 'mNearClippingDistance', { type: 'slide', min: 1, max: 6, step: 0.01 }).onChange(draw)

    // panel.addSlider(objConv, 'conv', 'range', {
    //     onChange: () => {
    //         stereoCamera.mConvergence = parseFloat(objConv.conv);
    //         console.log(objConv);
    //         draw()
    //     }
    // });
    // panel.addSlider(objEyes, 'eyes', 'range', {
    //     onChange: () => {
    //         stereoCamera.mEyeSeparation = parseFloat(objConv.eyes); // sets to undefined or NaN for some reason
    //         console.log(objConv);
    //         console.log(stereoCamera);
    //         draw()
    //     }
    // })

    surface = new Model('Surface');
    surface2 = new Model('Surface2');
    surface.BufferData(CreateSurfaceData());
    surface2.BufferData([-1, -1, 0, 1, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0]);
    surface.BufferData2(CreateSurfaceData2());
    surface2.BufferData2([1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0]);


    gl.enable(gl.DEPTH_TEST);
}

function draw2() {
    draw()
    window.requestAnimationFrame(draw2)
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    // camera = startCamera();
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw2();
}

function CreateTexture() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function startCamera() {
    const video = document.createElement('video');
    video.setAttribute('autoplay', true);
    window.vid = video;
    navigator.getUserMedia({ video: true, audio: false }, function(stream) {
        video.srcObject = stream;
        track = stream.getTracks()[0];
    }, function(e) {
        console.error('Rejected!', e);
    });
    return video;
}
let magAccessed = false;
let heading = 0;
let rotationMatrix = m4.identity();
function accessMagnetometer() {
    const message = document.getElementById("message");
    message.innerText = 'Accessing magnetometer...';
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                console.log(response);
                if (response === 'granted') {
                    console.log('Permission granted');
                    window.addEventListener('deviceorientation', e => {
                        message.innerText = e.webkitCompassHeading
                        heading = e.webkitCompassHeading
                        rotationMatrix = m4.multiply(m4.xRotation(deg2rad(e.gamma)), m4.multiply(m4.yRotation(deg2rad(e.beta)), m4.zRotation(deg2rad(e.alpha))))
                    }, true);
                    magAccessed = true;
                }
            }).catch((err => {
                console.log('Err', err);
            }));
    }
}