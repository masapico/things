import { ListGroup, Stack } from "react-bootstrap"
import type { TasksResponse } from "../../../lib/pb_types"
import { Check, MoveDown, MoveUp, PackagePlus, PhoneIncoming, Target, Trash, Undo } from "lucide-react"
import "./TaskListRow.css"


type TaskListRowProps = {
    task: TasksResponse
}

export function TaskListRow({task}: TaskListRowProps) {
    const iconSize = 16

    return (
        <ListGroup.Item className={task.status}>
            <Stack direction="horizontal" gap={2}>
                <div className={task.status === "completed" ? "text-decoration-line-through text-secondary" : ""}>
                    {task.title}
                </div>
                <div className="ms-auto" role="button" title={task.status === "completed" ? "undo" : "complete"}>
                    {task.status === "completed" ? <Undo size={iconSize} /> : <Check size={iconSize} />}     
                </div>
                <div role="button" title="set next">
                    <Target size={iconSize} />
                </div>
                <div role="button" title="waiting...">
                    <PhoneIncoming size={iconSize} />
                </div>
                {task.status === "inbox" ?
                    <div role="button" title="Move to Project">
                        <PackagePlus size={iconSize} />
                    </div>
                    :
                    <>
                    <div role="button">
                        <MoveUp size={iconSize} />
                    </div>
                    <div role="button">
                        <MoveDown size={iconSize} />
                    </div>
                    </>
                }
                <div role="button" title="delete forever">
                    <Trash size={iconSize} />
                </div>
            </Stack>
        </ListGroup.Item>
    )
}