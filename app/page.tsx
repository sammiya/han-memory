"use client"; // ← これが大事。Client Component 化

import React, { useState, useRef } from "react";

export default function HangulNumberPage() {
  // 1〜10のハングル対応用マッピング
  const numberToHangul = {
    1: "일",
    2: "이",
    3: "삼",
    4: "사",
    5: "오",
    6: "육",
    7: "칠",
    8: "팔",
    9: "구",
    10: "십",
  };

  // 配列をシャッフルするユーティリティ関数
  const shuffleArray = (array: any[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ステート管理
  const [started, setStarted] = useState(false); // 「開始」ボタンが押されたか
  const [questionIndex, setQuestionIndex] = useState(0); // 現在の問題インデックス
  const [shuffledNumbers, setShuffledNumbers] = useState<number[]>([]); // シャッフルされた出題リスト
  const [currentNumber, setCurrentNumber] = useState<number | null>(null); // 今の問題（数字）
  const [drawing, setDrawing] = useState(false);
  const [trace, setTrace] = useState<any[]>([]);
  const [resultMsg, setResultMsg] = useState("");
  // 各問題の { question, correct, time, imageData, correctHangul } を格納
  const [results, setResults] = useState<any[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Canvasの参照と座標バッファ
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentXArr = useRef<number[]>([]);
  const currentYArr = useRef<number[]>([]);

  // 正解音と不正解音
  const correctAudio = useRef<HTMLAudioElement | null>(
    typeof Audio !== "undefined"
      ? new Audio(
          "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
        )
      : null
  );
  const wrongAudio = useRef<HTMLAudioElement | null>(
    typeof Audio !== "undefined"
      ? new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg")
      : null
  );

  // ブラウザの音声読み上げを利用してハングルを発音
  const speakHangul = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance(text);
      // 韓国語音声がある場合は ko-KR を指定
      utter.lang = "ko-KR";
      window.speechSynthesis.speak(utter);
    } else {
      alert("音声読み上げに対応していません。");
    }
  };

  // 「開始」ボタン
  const handleStart = () => {
    setStarted(true);
    setQuestionIndex(0);
    setResults([]);

    // 1～10をシャッフルして出題リストを作成
    const arr = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    setShuffledNumbers(arr);

    // 最初の問題を読み込み
    loadQuestion(arr, 0);
  };

  // 1問読み込み
  const loadQuestion = (arr: number[], index: number) => {
    if (!arr || arr.length === 0) return;

    const questionNumber = arr[index];
    setCurrentNumber(questionNumber);
    clearCanvas();
    setStartTime(Date.now());
  };

  // === ユーザーの描画内容を切り取って画像として返す ===
  const getCroppedImageURL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // trace から描いた軌跡の最小・最大XYを取得
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    trace.forEach(([xs, ys]) => {
      xs.forEach((x: number) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      });
      ys.forEach((y: number) => {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });

    // 少しマージンをつける
    const margin = 5;
    minX = Math.max(minX - margin, 0);
    minY = Math.max(minY - margin, 0);
    maxX = Math.min(maxX + margin, canvas.width);
    maxY = Math.min(maxY + margin, canvas.height);

    // 軌跡が何もない場合の対策
    if (
      minX === Infinity ||
      minY === Infinity ||
      maxX === -Infinity ||
      maxY === -Infinity
    ) {
      // 何も描いてなければ空で
      return null;
    }

    const width = maxX - minX;
    const height = maxY - minY;
    if (width <= 0 || height <= 0) {
      return null;
    }

    // オフスクリーンCanvasを作成して描画
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return null;

    offCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
    return offscreen.toDataURL("image/png");
  };

  // 問題終了処理 → 次の問題へ
  const nextQuestion = (
    isCorrect: boolean,
    imageData: string | null,
    correctHangul: string
  ) => {
    if (!startTime) return;
    const endTime = Date.now();
    // 経過時間(0.1秒単位)
    const elapsed = ((endTime - startTime) / 1000).toFixed(1);

    setResults((prev) => [
      ...prev,
      {
        question: currentNumber,
        correct: isCorrect,
        time: elapsed,
        imageData,
        correctHangul,
      },
    ]);

    const newIndex = questionIndex + 1;
    if (newIndex < 10) {
      setQuestionIndex(newIndex);
      loadQuestion(shuffledNumbers, newIndex);
    } else {
      setQuestionIndex(10);
      setCurrentNumber(null);
    }
  };

  // 描画開始
  const startDrawing = (x: number, y: number) => {
    setDrawing(true);
    currentXArr.current = [x];
    currentYArr.current = [y];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // 線を引く
  const drawLine = (x: number, y: number) => {
    if (!drawing) return;

    currentXArr.current.push(x);
    currentYArr.current.push(y);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // 描画終了
  const endDrawing = () => {
    if (!drawing) return;
    setDrawing(false);
    setTrace((prev) => [
      ...prev,
      [[...currentXArr.current], [...currentYArr.current], []],
    ]);
  };

  // Canvasクリア
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTrace([]);
    setResultMsg("");
  };

  // 判定ボタン
  const submitAnswer = () => {
    if (!canvasRef.current) return;
    if (trace.length === 0) {
      alert("先に書いてください");
      return;
    }

    const data = JSON.stringify({
      options: "enable_pre_space",
      requests: [
        {
          writing_guide: {
            writing_area_width: canvasRef.current.width,
            writing_area_height: canvasRef.current.height,
          },
          ink: trace,
          language: "ko",
        },
      ],
    });

    fetch(
      "https://inputtools.google.com/request?itc=ko-t-i0-handwrit&app=mobilesearch",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: data,
      }
    )
      .then((res) => res.json())
      .then((resData) => {
        const imageData = getCroppedImageURL();
        if (!currentNumber) return;
        const correct = numberToHangul[currentNumber];

        if (resData[0] === "SUCCESS") {
          // 最初の候補
          const candidate = resData[1][0][1][0];
          if (candidate === correct) {
            correctAudio.current?.play();
            setResultMsg(`認識: ${candidate}\n正解です！\n「${correct}」`);
            setTimeout(() => {
              nextQuestion(true, imageData, correct);
            }, 1000);
          } else {
            wrongAudio.current?.play();
            setResultMsg(
              `認識: ${candidate}\n不正解です... 正解は「${correct}」`
            );
            setTimeout(() => {
              nextQuestion(false, imageData, correct);
            }, 2000);
          }
        } else {
          setResultMsg("認識に失敗しました...");
        }
      })
      .catch((err) => {
        console.error(err);
        setResultMsg("サーバエラーが発生しました");
      });
  };

  // ギブアップ
  const giveUp = () => {
    const imageData = getCroppedImageURL();
    if (!currentNumber) return;

    const correct = numberToHangul[currentNumber];
    setResultMsg(`ギブアップ！\n正解は "${correct}" でした！`);
    wrongAudio.current?.play();
    setTimeout(() => {
      nextQuestion(false, imageData, correct);
    }, 2000);
  };

  // マウスイベント
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    startDrawing(x, y);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawLine(x, y);
  };
  const handleMouseUp = () => {
    endDrawing();
  };

  // タッチイベント
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    startDrawing(x, y);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    drawLine(x, y);
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endDrawing();
  };

  // 最終結果表示
  const renderFinalResult = () => {
    // 正解数
    const totalCorrect = results.filter((r) => r.correct).length;

    return (
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-2">結果発表</h2>
        <p className="mb-4">あなたの得点: {totalCorrect} / 10</p>

        <table className="table-auto w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-2 py-1">問題</th>
              <th className="border px-2 py-1">回答</th>
              <th className="border px-2 py-1">正答</th>
              <th className="border px-2 py-1">正誤</th>
              <th className="border px-2 py-1">経過時間(秒)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => (
              <tr key={idx} className="text-center h-14">
                <td className="border px-2 py-1 align-middle">{r.question}</td>
                <td className="border px-2 py-1 align-middle">
                  {r.imageData ? (
                    <img
                      src={r.imageData}
                      alt="回答"
                      className="mx-auto h-12"
                    />
                  ) : (
                    <span>なし</span>
                  )}
                </td>
                <td className="border px-2 py-1 align-middle">
                  <span lang="ko">{r.correctHangul}</span>{" "}
                  <button
                    onClick={() => speakHangul(r.correctHangul)}
                    className="ml-2 px-2 py-1 bg-blue-200 rounded hover:bg-blue-300"
                  >
                    ▶
                  </button>
                </td>
                <td className="border px-2 py-1 align-middle">
                  {r.correct ? (
                    <span className="text-red-500 text-2xl font-bold">○</span>
                  ) : (
                    <span className="text-blue-500 text-2xl font-bold">×</span>
                  )}
                </td>
                <td className="border px-2 py-1 align-middle">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // メイン描画
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-4 text-blue-600">
          ハングル練習
        </h1>

        {!started ? (
          <div className="text-center">
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors"
              onClick={handleStart}
            >
              開始
            </button>
          </div>
        ) : questionIndex < 10 ? (
          <>
            <div className="text-xl text-center mb-4 bg-blue-50 p-3 rounded-md font-medium">
              {`問題 ${
                questionIndex + 1
              } / 10: 数字 ${currentNumber} をハングルで書こう!`}
            </div>

            <div className="mb-4 flex justify-center">
              <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="border-2 border-gray-300 rounded bg-white shadow-sm"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            <div className="flex justify-center space-x-3 mb-4">
              <button
                onClick={submitAnswer}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
              >
                判定する
              </button>
              <button
                onClick={clearCanvas}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
              >
                消す
              </button>
              <button
                onClick={giveUp}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
              >
                ギブアップ
              </button>
            </div>

            <div className="text-center whitespace-pre-line min-h-16 p-2 bg-gray-50 rounded-md">
              {resultMsg}
            </div>
          </>
        ) : (
          renderFinalResult()
        )}
      </div>
    </div>
  );
}
