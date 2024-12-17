import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Draggable from "react-draggable";
import { SWATCHES } from "@/constants";

import { ButtonLoading } from "@/components/ui/loading";
//import { ButtonWithIcon } from '@/components/ui/icobBtn';

// import {LazyBrush} from 'lazy-brush';

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);

  // const lazyBrush = new LazyBrush({
  //     radius: 10,
  //     enabled: true,
  //     initialPoint: { x: 0, y: 0 },
  // });

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = "round";
        ctx.lineWidth = 3;
      }
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const [IsAutoClear, setIsAutoClear] = useState(false);
  const [IsInfo, setIsInfo] = useState(true);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);
    console.log(latex);

    // Clear the main canvas
    if (IsAutoClear) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Mouse Handlers
  const startDrawingMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (canvas) {
      canvas.style.background = "black";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const drawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  // Touch Handlers
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling or gestures
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = "black";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
      }
    }
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling or gestures
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.strokeStyle = color;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };
  const [isRunning, setIsRunning] = useState(false);
  const runRoute = async () => {
    const canvas = canvasRef.current;
    setIsRunning(true);

    if (canvas) {
      const response = await axios({
        method: "post",
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      });

      const resp = await response.data;
      if (resp) setIsRunning(false);
      console.log("Response", resp);
      resp.data.forEach((data: Response) => {
        if (data.assign === true) {
          // dict_of_vars[resp.result] = resp.answer;
          setDictOfVars({
            ...dictOfVars,
            [data.expr]: data.result,
          });
        }
      });
      const ctx = canvas.getContext("2d");
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (imageData.data[i + 3] > 0) {
            // If pixel is not transparent
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setLatexPosition({ x: centerX, y: centerY });
      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({
            expression: data.expr,
            answer: data.result,
          });
        }, 1000);
      });
    }
  };

  return (
    <>
      <div>
        <div className="flex justify-center gap-4 p-5 items-center">
          <Button
            onClick={() => setIsAutoClear(!IsAutoClear)}
            variant="outline"
            className="text-white z-20 bg-red-400"
          >
            {IsAutoClear ? "AC:ON" : "AC:OFF"}
          </Button>
          <Button
            onClick={() => {
              setReset(true);
              setIsInfo(false);
            }}
            className="z-20 text-white"
            variant="destructive"
            color="red"
          >
            Reset
          </Button>
          <Group className="z-20 border p-2 rounded-md border-gray-500 gap-2">
            {SWATCHES.map((swatch) => (
              <div
                key={swatch}
                className="border rounded-full  flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-gray-400"
              >
                <ColorSwatch color={swatch} onClick={() => setColor(swatch)} />
              </div>
            ))}
            
          </Group>
          {/* Erase button */}
          <Button
            onClick={() => setColor("black")}
            className="z-20 text-white"
            variant="default"
            color="blue"
          >Erase</Button>

          {isRunning ? (
            <ButtonLoading />
          ) : (
            <Button
              onClick={runRoute}
              className="z-20 text-white"
              variant="default"
              color="green"
            >
              Run
            </Button>
          )}
        </div>
      </div>
      {IsInfo && (
        <div
          className="flex flex-col w-100 items-center m-auto mt-44"
          id="info"
        >
          <h1 className="font-extrabold text-6xl text-white ">
            Math Notes
            <sub className=" text-blue-600 font-serif font-extralight text-sm border rounded-full pl-2 pr-2">
              Ai
            </sub>
          </h1>
          <p className="font-mono font-thin text-gray-600">
            A Smart Pad for Solving Complex Math Equations.
          </p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0  w-full h-full cursor-crosshair   "
        onMouseDown={startDrawingMouse}
        onMouseMove={drawMouse}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawingTouch}
        onTouchMove={drawTouch}
        onTouchEnd={stopDrawing}
      />

      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className="absolute p-2 text-white rounded shadow-none">
              <div className="latex-content">{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  );
}
