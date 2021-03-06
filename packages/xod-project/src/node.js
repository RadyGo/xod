import * as R from 'ramda';
import { maybePath } from 'xod-func-tools';

import * as Pin from './pin';
import * as Utils from './utils';
import * as CONST from './constants';
import { def } from './types';
import {
  isInputTerminalPath,
  isOutputTerminalPath,
  isTerminalPatchPath,
  getTerminalDataType,
  isPathLocal,
  getBaseName,
  isSpecializationPatchBasename,
  isTetheringInetPatchPath,
} from './patchPathUtils';

/**
 * @typedef {Object} Node
 */

/**
 * A {@link Node} object or just its ID as {@link string}
 * @typedef {(Node|string)} NodeOrId
 */

/**
 * Pin value can be one of this type:
 *
 * - {@link string}
 * - {@link number}
 * - {@link boolean}
 * - {@link Pulse}
 *
 * And it is never can be {@link Null} or {@link undefined}
 *
 * @typedef {(string|number|boolean|Pulse)} DataValue
 */

// =============================================================================
//
// Node
//
// =============================================================================

/**
 * @function createNode
 * @param {Position} position - coordinates of new node’s center
 * @param {string} type - path to the patch, that will be the type of node to create
 * @returns {Node} new node
 */
export const createNode = def(
  'createNode :: Position -> PatchPath -> Node',
  (position, type) => ({
    '@@type': 'xod-project/Node',
    id: Utils.generateId(),
    type,
    position,
    label: '',
    description: '',
    boundLiterals: {},
    arityLevel: 1,
    size: { width: 0, height: 0 },
  })
);

/**
 * @function duplicateNode
 * @param {Node} node - node to clone
 * @returns {Node} cloned node with new id
 */
export const duplicateNode = def(
  'duplicateNode :: Node -> Node',
  R.compose(newNode => R.assoc('id', Utils.generateId(), newNode), R.clone)
);

/**
 * @function getNodeId
 * @param {NodeOrId} node
 * @returns {string}
 */
export const getNodeId = def(
  'getNodeId :: NodeOrId -> NodeId',
  R.ifElse(R.is(String), R.identity, R.prop('id'))
);

/**
 * Only for using in `xod-project`
 * @function setNodeId
 * @param {NodeId} nodeId
 * @param {Node} node
 * @returns {Node}
 */
export const setNodeId = def(
  'setNodeId :: NodeId -> Node -> Node',
  R.assoc('id')
);

/**
 * @function getNodeType
 * @param {Node} node
 * @returns {string}
 */
export const getNodeType = def(
  'getNodeType :: Node -> PatchPath',
  R.prop('type')
);

/**
 * @function setNodeType
 * @param {string} patchPath
 * @param {Node} node
 * @returns {Node}
 */
export const setNodeType = def(
  'setNodeType :: PatchPath -> Node -> Node',
  R.assoc('type')
);

/**
 * @function getNodeLabel
 * @param {Node} node
 * @returns {string}
 */
export const getNodeLabel = def(
  'getNodeLabel :: Node -> String',
  R.prop('label')
);

/**
 * @function setNodeLabel
 * @param {string} label
 * @param {Node} node
 * @returns {Node}
 */
export const setNodeLabel = def(
  'setNodeLabel :: String -> Node -> Node',
  R.assoc('label')
);

/**
 * @function getNodeDescription
 * @param {Node} node
 * @returns {string}
 */
export const getNodeDescription = def(
  'getNodeDescription :: Node -> String',
  R.prop('description')
);

/**
 * @function setNodeDescription
 * @param {string} description
 * @param {Node} node
 * @returns {Node}
 */
export const setNodeDescription = def(
  'setNodeDescription :: String -> Node -> Node',
  R.assoc('description')
);

/**
 * @function setNodePosition
 * @param {Position} position - new coordinates of node’s center
 * @param {Node} node - node to move
 * @returns {Node} copy of node in new coordinates
 */
export const setNodePosition = def(
  'setNodePosition :: Position -> Node -> Node',
  (pos, node) => R.assoc('position', pos, node)
);

/**
 * @function getNodePosition
 * @param {Node} node
 * @returns {Position}
 */
export const getNodePosition = def(
  'getNodePosition :: Node -> Position',
  R.prop('position')
);

export const getNodeSize = def('getNodeSize :: Node -> Size', R.prop('size'));

export const setNodeSize = def(
  'setNodeSize :: Size -> Node -> Node',
  (size, node) => R.assoc('size', size, node)
);

/**
 * @function setNodeArityLevel
 * @param {Node} node
 * @returns {Node}
 */
export const setNodeArityLevel = def(
  'setNodeArityLevel :: ArityLevel -> Node -> Node',
  R.assoc('arityLevel')
);

/**
 * @function getNodeArityLevel
 * @param {Node} node
 * @returns {ArityLevel}
 */
export const getNodeArityLevel = def(
  'getNodeArityLevel :: Node -> ArityLevel',
  R.prop('arityLevel')
);

/**
 * @function isInputPinNode
 * @param {Node} node
 * @returns {boolean}
 */
export const isInputPinNode = def(
  'isInputPinNode :: Node -> Boolean',
  R.compose(isInputTerminalPath, getNodeType)
);

/**
 * @function isOutputPinNode
 * @param {Node} node
 * @returns {boolean}
 */
export const isOutputPinNode = def(
  'isOutputPinNode :: Node -> Boolean',
  R.compose(isOutputTerminalPath, getNodeType)
);

/**
 * @function isTerminalNode
 * @param {Node} node
 * @returns {boolean}
 */
export const isTerminalNode = def(
  'isTerminalNode :: Node -> Boolean',
  R.compose(isTerminalPatchPath, getNodeType)
);

/**
 * @function isPinNode
 * @param {Node} node
 * @returns {boolean}
 */
export const isPinNode = def(
  'isPinNode :: Node -> Boolean',
  R.either(isInputPinNode, isOutputPinNode)
);

/**
 * Checks that Node have a NodeType referenced to local PatchPath.
 * E.G. `@/foo`.
 */
export const isLocalNode = def(
  'isLocalNodeType :: Node -> Boolean',
  R.compose(isPathLocal, getNodeType)
);

/**
 * Checks that Node have a NodeType referenced to the specialization Patch.
 * E.G. `@/if-else(number)`
 */
export const isSpecializationNode = def(
  'isSpecializationNode :: Node -> Boolean',
  R.compose(isSpecializationPatchBasename, getBaseName, getNodeType)
);

// =============================================================================
//
// Pins
//
// =============================================================================

/**
 * Gets all bound values of node's pins
 *
 * Note that the returned object may not contain values
 * for some of the existing pins(if they were not bound)
 * or may contain values for pins that were deleted.
 *
 * @function getAllBoundValues
 * @param {Node} node
 * @returns {Object.<PinKey, DataValue>}
 */
export const getAllBoundValues = def(
  'getAllBoundValues :: Node -> Map PinKey DataValue',
  R.prop('boundLiterals')
);

const pathToBoundValue = pinKey => ['boundLiterals', pinKey];

/**
 * Gets bound value of a pin.
 *
 * @function getBoundValue
 * @param {string} key
 * @param {Node} node
 * @returns {Maybe<DataValue>}
 */
export const getBoundValue = def(
  'getBoundValue :: PinKey -> Node -> Maybe DataValue',
  R.useWith(maybePath, [pathToBoundValue, R.identity])
);

export const getBoundValueOrDefault = def(
  'getBoundValueOrDefault :: Pin -> Node -> DataValue',
  (pin, node) =>
    getBoundValue(Pin.getPinKey(pin), node).getOrElse(
      Pin.getPinDefaultValue(pin)
    )
);

/**
 * Sets bound value to a pin.
 *
 * @function setBoundValue
 * @param {string} key
 * @param {*} value
 * @param {Node} node
 * @returns {Node}
 */
export const setBoundValue = def(
  'setBoundValue :: PinKey -> DataValue -> Node -> Node',
  R.useWith(R.assocPath, [pathToBoundValue, R.identity, R.identity])
);

export const removeBoundValue = def(
  'removeBoundValue :: PinKey -> Node -> Node',
  R.uncurryN(2, pinKey => R.dissocPath(['boundLiterals', pinKey]))
);

export const dropAllBoundValues = def(
  'dropAllBoundValues :: Node -> Node',
  R.assoc('boundLiterals', {})
);

/**
 * Returns data type extracted from pinNode type
 * @function getPinNodeDataType
 * @param {Node} node
 * @returns {DataType}
 */
export const getPinNodeDataType = def(
  'getPinNodeDataType :: TerminalNode -> DataType',
  R.compose(getTerminalDataType, getNodeType)
);

/**
 * Returns pin direction extracted from pinNode type
 * @function getPinDirectionFromNodeType
 * @param {Node} node
 * @returns {PinDirection}
 */
export const getPinNodeDirection = def(
  'getPinNodeDirection :: TerminalNode -> PinDirection',
  R.cond([
    [isInputPinNode, R.always(CONST.PIN_DIRECTION.INPUT)],
    [isOutputPinNode, R.always(CONST.PIN_DIRECTION.OUTPUT)],
  ])
);

/**
 * Returns True if the Node is tethering inet
 */
// :: Node -> Boolean
export const isTetheringInetNode = R.compose(
  isTetheringInetPatchPath,
  getNodeType
);
