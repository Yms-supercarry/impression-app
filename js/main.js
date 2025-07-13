// js/main.js

// 调用 Worker 进行色彩印象分析
function analyzeImageImpression(bitmap, space, callback) {
  var worker = Object.create(MediaMatrix.worker.WorkerObject);
  worker.method = "analyzeImpression";
  worker.args = { space: space, bitmap: bitmap };
  worker.onmessage = function(event) { callback(event.data); };
  worker.onerror = function(err) { console.error("Worker 错误:", err); };
  worker.start();
}

$(function(){
  var $spin   = $("#spin");
  var $result = $("#result_content");

  $("#imageFile").on("change", function(){
    var file = this.files[0];
    if (!file) return;

    // 清空结果并显示加载动画
    $result.empty();
    $spin.empty();
    var spinner = new Spinner({
      lines: 12, length: 7, width: 4,
      radius: 10, color: "#000", speed: 1, trail: 60
    }).spin($spin[0]);

    // 读取图片
    var reader = new FileReader();
    reader.onload = function(evt){
      var img = new Image();
      img.onload = function(){
        // 创建缩略图 canvas
        var canvas = document.createElement("canvas");
        var maxW = 400, maxH = 400;
        var ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.classList.add("thumb");

        // 提取像素数据
        var bitmap = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 获取印象空间
        var space = $("input[name=culture]:checked").val() || "CIS";

        // 调用 Worker 分析
        analyzeImageImpression(bitmap, space, function(result){
          // 停止加载动画
          spinner.stop();
          $spin.empty();

          // 显示缩略图
          $result.empty().append(canvas);

          // 渲染前 5 名印象卡片
          result.slice(0,5).forEach(function(item){
            var $card = $('<div class="impress-item"></div>');

            // 缩略图
            var thumbURL = canvas.toDataURL();
            var $thumb = $('<img class="thumb">').attr("src", thumbURL);

            // 文本：名称+得分
            var scoreText = Number(item.score).toFixed(3);
            var $text = $('<div class="impress-content"></div>')
                          .append($('<strong>').text(item.name + ": "))
                          .append(document.createTextNode(scoreText));

            // 色块小图
            var ci = Object.create(MediaMatrix.core.ColorImpression);
            ci.predefined(space);
            var swatchURL = ci.toImage(item.name);
            var $swatch = $('<img class="swatch">').attr("src", swatchURL);

            // 下载色块按钮
            var $btnSwatch = $('<button>下载色块</button>').on("click", function(){
              var a = document.createElement("a");
              a.href = swatchURL;
              a.download = item.name + "_swatch.png";
              a.click();
            });

            // 导出 CSV 按钮
            var $btnCSV = $('<button>导出 CSV</button>').on("click", function(){
              var csv = "name,score\n" + item.name + "," + item.score + "\n";
              var blob = new Blob([csv], { type: "text/csv" });
              var url  = URL.createObjectURL(blob);
              var a    = document.createElement("a");
              a.href     = url;
              a.download = item.name + "_impression.csv";
              a.click();
              setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
            });

            // 组装并追加
            $card.append($thumb, $text, $swatch, $btnSwatch, $btnCSV);
            $result.append($card);
          });
        });
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
});

