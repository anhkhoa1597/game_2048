import argparse
import contextlib
import io
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

import run


def write_model(path, tc=False):
    with path.open("wb") as stream:
        stream.write(struct.pack("<BI", 0, 2))
        for index in range(2):
            stream.write(struct.pack("<B8sHQ", 4, bytes([index]) * 8, 4, 16 ** 4))
            stream.write(struct.pack("<f", 1.0) * 16 ** 4)
            if tc:
                stream.write(struct.pack("<HQ", 4, 2 * 16 ** 4))
                stream.write(struct.pack("<f", 2.0) * (2 * 16 ** 4))
            stream.write(struct.pack("<H", 0))


class RunnerTest(unittest.TestCase):
    def test_resume_schedule_and_retention(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            args = argparse.Namespace(network="2x4patt", plan_episodes=20,
                                      seed="test", episodes=10, chunk=5,
                                      threads=2, work=folder)
            commands = []

            def engine(command, log):
                commands.append(command)
                if "-i" in command:
                    self.assertNotIn("=", command[command.index("-n") + 1])
                    self.assertTrue(Path(command[command.index("-i") + 1]).is_file())
                else:
                    self.assertIn("=320000/norm", command[command.index("-n") + 1])
                write_model(Path(command[command.index("-o") + 1]), "coherence" in command)

            with patch.object(run, "execute", engine), contextlib.redirect_stdout(io.StringIO()):
                run.train(args, Path("fake"), folder)
                self.assertEqual(run.latest(folder)[0]["completed"], 10)
                run.train(args, Path("fake"), folder)
            state, model = run.latest(folder)
            self.assertEqual(state["completed"], 20)
            self.assertEqual(state["method"], "coherence")
            self.assertEqual(len(list(folder.glob("checkpoint-*"))), 2)
            self.assertEqual([c[c.index("-a") + 1] for c in commands],
                             ["0.1", "0.1", "0.01", "0.001", "1.0"])
            seeds = [c[c.index("-s") + 1] for c in commands]
            self.assertEqual(len(seeds), len(set(seeds)))
            args.seed = "different"
            with self.assertRaises(ValueError):
                run.train(args, Path("fake"), folder)
            with model.open("r+b") as stream:
                stream.seek(30)
                stream.write(b"corrupt")
            with self.assertRaises(ValueError):
                run.latest(folder)

    def test_incomplete_bundle_ignored(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            (folder / ".pending-interrupted").mkdir()
            (folder / "checkpoint-000000000005").mkdir()
            self.assertEqual(run.latest(folder), (None, None))

    def test_binary_validation(self):
        with tempfile.TemporaryDirectory() as folder:
            model = Path(folder) / "model.w"
            write_model(model)
            run.validate_weights(model, "2x4patt", False)
            with self.assertRaises(ValueError):
                run.validate_weights(model, "2x4patt", True)
            write_model(model, True)
            run.validate_weights(model, "2x4patt", True)
            with model.open("r+b") as stream:
                stream.truncate(100)
            with self.assertRaises((ValueError, struct.error)):
                run.validate_weights(model, "2x4patt", True)

    def test_failed_batch_keeps_checkpoint(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            model = folder / "source.w"
            write_model(model)
            config = dict(revision=run.REVISION, network="2x4patt",
                          plan_episodes=20, seed="test", completed=5, method="fixed")
            run.publish(folder, model, config)
            args = argparse.Namespace(network="2x4patt", plan_episodes=20,
                                      seed="test", episodes=5, chunk=5, threads=1, work=folder)
            with patch.object(run, "execute", side_effect=RuntimeError("interrupted")):
                with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(RuntimeError):
                    run.train(args, Path("fake"), folder)
            self.assertEqual(run.latest(folder)[0]["completed"], 5)

    def test_notebook_code(self):
        notebook = Path(__file__).parents[1] / "colab/train_tdl2048.ipynb"
        for cell in json.loads(notebook.read_text())["cells"]:
            if cell["cell_type"] == "code":
                compile("".join(cell["source"]), str(notebook), "exec")
                self.assertEqual(cell["outputs"], [])


if __name__ == "__main__":
    unittest.main()
