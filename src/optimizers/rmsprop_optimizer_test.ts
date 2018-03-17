/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as dl from '../index';
import {ALL_ENVS, describeWithFlags, expectArraysClose} from '../test_util';

describeWithFlags('RMSPropOptimizer', ALL_ENVS, () => {
  it('basic', () => {
    const learningRate = 0.1;
    const moment = 0.1;
    const rho = 0.95;
    const optimizer = dl.train.rmsprop(learningRate, rho, moment);

    const x = dl.tensor1d([1, 2]).variable();

    const f = () => x.square().sum() as dl.Scalar;

    let numTensors = dl.memory().numTensors;

    let cost = optimizer.minimize(f, /* returnCost */ true);

    // Cost & 2 accumulators should be the only additional arrays.
    expect(dl.memory().numTensors).toBe(numTensors + 3);

    // epsilon = 1e-8
    // newAccumulatedMeanSquare =
    //          rho * accumulatedMeanSquare + (1 - rho) * grad ^ 2 = (0.2)
    // newAccumulatedMoments = momentum * accumulatedMoments +
    //          learning_rate * gradient / sqrt(newAccumulatedMeanSquare +
    //          epsilon) = 0.1 * 0 + ((0.1 * 2) / sqrt(0.2 + 1e-8)) = 0.44721
    // x -= learningRate * newAccumulatedMoments
    //
    // de/dx = [2, 4]
    // accumulatedMeanSquare = [0, 0]
    // newAccumulatedMeanSquare = [.2, .8]
    // accumulatedMoments = [0, 0]
    // newAccumulatedMoments = [0.44721, 0.44721]
    // x = [0.55279, 1.55279]
    expectArraysClose(x, [0.55279, 1.55279]);

    cost.dispose();
    numTensors = dl.memory().numTensors;

    cost = optimizer.minimize(f, /* returnCost */ false);

    // x = [0.55279, 1.55279]
    // de/dx = [1.10558, 3.10558]
    // accumulatedMeanSquare = [0.2, 0.8]
    // newAccumulatedMeanSquare = [0.25105125, 1.242231]
    // accumulatedMoments = [0.44721, 0.44721]
    // newAccumulatedMoments = [0.26534, 0.32336]
    // x = [0.28745, 1.22943]

    // TODO: Fix numerical precision.
    expectArraysClose(x, [0.28745, 1.222943], 1e-2);

    // There should be no new additional Tensors.
    expect(dl.memory().numTensors).toBe(numTensors);

    expect(cost).toBe(null);

    x.dispose();
    optimizer.dispose();
    // The only tensor remaining is the argument to variable().
    expect(dl.memory().numTensors).toBe(1);
  });
});
