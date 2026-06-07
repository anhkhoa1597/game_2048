# Colab Training

This notebook/script now keeps only the new large n-tuple track.

Production local bot remains:

```txt
js/ai/ntuple/ntupleWeights.js
ntupleTdBeam2
futureWeight = 0.49
```

For Colab, upload:

```txt
js/ai/ntuple/train_ntuple_td.py
js/ai/colab/trainSnakeColab.sh
```

to:

```txt
MyDrive/MyProjects/2048-ai/scripts/
```

Then run:

```bash
!chmod +x /content/drive/MyDrive/MyProjects/2048-ai/scripts/trainSnakeColab.sh
!EPISODES=200000 /content/drive/MyDrive/MyProjects/2048-ai/scripts/trainSnakeColab.sh
```

The script resumes automatically from:

```txt
MyDrive/MyProjects/2048-ai/models/ntupleWeights-snake6-td.js
```
