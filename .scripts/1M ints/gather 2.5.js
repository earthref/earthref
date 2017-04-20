var _ = require('lodash');
var fs = require('fs');

10111
8671
9324
8590
8687
8707
8596
8668
11633
11631
10988
10447
3474
7737
7690
8775
8621
8952
8979
9048
9154
9171
8578
9288
9316
9346
9415
9474
9574
10110
9773
10768
9478
10163
9582
10708
9484
10727
10748
10750
11691
8212
8395
8066
8393
8677
8231
8137
8181
8072
8083
8278
8145
7601
8690
8161
8142
8202
8396
7590
8194
8401
8151
9327
8404
7674
8622
8397
8625
8141
8385
8708
8796
8706
8391
9330
8592
8140
7539
8054
8196
8201
8064
8818
8180
8132
8163
8238
7622
9322
8146
7627
8082
8154
8232
8133
7614
8057
9463
8156
8074
7673
7680
8120
8121
7571
8073
7779
8178
10047
8157
7751
8078
8254
7647
8069
7586
8053
8147
8164
8558
8724
7611
8177
10048
7535
8056
8204
7581
7853
9340
9606
8063
8128
7606
8166
7562
8124
10156
8058
8144
8080
11129
11411
11391
11392
11395
11131
9485
8184
8160
7551
8065
8061
8079
8703
9488
8067
8205
7566
8129
8579
10087
8235
8131
8155
8070
7540
8055
7648
8059
7608
8171
11751
7676
11671
8228
8192
8149
8150
8403
8591
8199
8130
8200
7755
8213
8187
7568
8606
8589
7624
8193
7635
8159
9412
8799
8735
8195
9750
11229
11234
7600
8950
10150
9503
8951
10947
8748
7583
7630
8037
8085
8198
8060
7545
8143
8153
8126
8183
8722
7777
8234
7609
8173
8233
11028
10369
10370
8705
8433
8152
8119
7536
8176
8236
8188
9393
8191
8158
8148
8186
8389
7629
8197
10067
9573
9580
9206
8175
8182
9477
8392
8954
7776
7764
8312
8756
7849
7767
8723
8229
7640
8227
10112
8616
8647
9476
7763
8221
9768
9612
8655
8629
9201
8787
8608
9564
8978
8602
9411
10154
8678
9758
9213
9570
9581
8630
8653
8709
8810
8742
9207
10162
7529
8633
9210
9481
9198
8654
8659
10136
8537
8673
7377
8760
7358
7331
8683
9483
8638
8614
9396
7502
10113
3472
8684
9482
10527
9451
9480
9449
9452
7695
8734
8944
9589
10134

var dir = '.data/level345/'
var chunkSize = 1000;
if (!fs.existsSync(dir + 'chunks/')) {
  fs.mkdirSync(dir + 'chunks');
  fs.readdir(dir, (err, files) => {
    files.forEach(file => {

      if (file === 'chunks') return;
      var lineReader = require('readline').createInterface({
        input: require('fs').createReadStream(dir+file)
      });

      var header = '';
      var lines = [];
      var iChunk = 1;
      lineReader
      .on('line', function (line) {
        if (header == '') {
          header = line;
          return;
        }
        lines.push(line);
        if (line[0] !== '<' && lines.length > chunkSize) {
          fs.writeFileSync(dir + 'chunks/' + file + '.' + iChunk, header + '\n' + lines.join('\n'));
          console.log('Wrote chunk', dir + 'chunks/' + file + '.' + iChunk);
          lines = [];
          iChunk += 1;
        }
      })
      .on('close', function() {
        fs.writeFileSync(dir + 'chunks/' + file + '.' + iChunk, header + '\n' + lines.join('\n'));
        console.log('Wrote chunk', dir + 'chunks/' + file + '.' + iChunk);
      });

    });
  });
}